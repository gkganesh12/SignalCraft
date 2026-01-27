import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, User } from '@signalcraft/database';
import { QueueService } from '../queues/queue.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePagingPolicyDto,
  PagingStepDto,
  TriggerPagingDto,
  UpdatePagingPolicyDto,
} from './dto/paging.dto';

@Injectable()
export class PagingService {
  private readonly prismaClient = prisma as any;

  constructor(
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
  ) {}

  async listPolicies(workspaceId: string) {
    return this.prismaClient.pagingPolicy.findMany({
      where: { workspaceId },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPolicy(workspaceId: string, policyId: string) {
    const policy = await this.prismaClient.pagingPolicy.findFirst({
      where: { id: policyId, workspaceId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!policy) {
      throw new NotFoundException('Paging policy not found');
    }

    return policy;
  }

  async createPolicy(workspaceId: string, dto: CreatePagingPolicyDto, actor: User) {
    this.validateSteps(dto.steps);

    const policy = await this.prismaClient.pagingPolicy.create({
      data: {
        workspaceId,
        rotationId: dto.rotationId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        enabled: dto.enabled ?? true,
        steps: {
          create: dto.steps.map((step, index) => this.mapStep(step, index)),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'CREATE_PAGING_POLICY',
      resourceType: 'PagingPolicy',
      resourceId: policy.id,
      metadata: { name: policy.name },
    });

    return policy;
  }

  async updatePolicy(
    workspaceId: string,
    policyId: string,
    dto: UpdatePagingPolicyDto,
    actor: User,
  ) {
    const existing = await this.prismaClient.pagingPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Paging policy not found');
    }

    if (dto.steps) {
      this.validateSteps(dto.steps);
    }

    const policy = await this.prismaClient.pagingPolicy.update({
      where: { id: policyId },
      data: {
        name: dto.name?.trim() ?? undefined,
        description: dto.description?.trim() ?? undefined,
        rotationId: dto.rotationId ?? undefined,
        enabled: dto.enabled ?? undefined,
        steps: dto.steps
          ? {
              deleteMany: {},
              create: dto.steps.map((step, index) => this.mapStep(step, index)),
            }
          : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'UPDATE_PAGING_POLICY',
      resourceType: 'PagingPolicy',
      resourceId: policy.id,
      metadata: { name: policy.name },
    });

    return policy;
  }

  async deletePolicy(workspaceId: string, policyId: string, actor: User) {
    const existing = await this.prismaClient.pagingPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Paging policy not found');
    }

    await this.prismaClient.pagingPolicy.delete({ where: { id: policyId } });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'DELETE_PAGING_POLICY',
      resourceType: 'PagingPolicy',
      resourceId: policyId,
      metadata: { name: existing.name },
    });

    return { success: true };
  }

  async triggerPaging(workspaceId: string, dto: TriggerPagingDto, actor?: User) {
    const policy = await this.prismaClient.pagingPolicy.findFirst({
      where: { id: dto.policyId, workspaceId, enabled: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!policy) {
      throw new NotFoundException('Paging policy not found or disabled');
    }

    if (!policy.steps.length) {
      throw new BadRequestException('Paging policy has no steps configured');
    }

    await prisma.alertGroup.findFirstOrThrow({
      where: { id: dto.alertGroupId, workspaceId },
    });

    const firstStep = policy.steps[0];
    await this.queueService.addJob(
      'paging',
      'paging-step',
      {
        workspaceId,
        policyId: policy.id,
        alertGroupId: dto.alertGroupId,
        stepOrder: firstStep.order,
        attemptNumber: 1,
      },
      { delay: Math.max(firstStep.delaySeconds, 0) * 1000 },
    );

    if (actor) {
      await this.auditService.log({
        workspaceId,
        userId: actor.id,
        action: 'TRIGGER_PAGING',
        resourceType: 'AlertGroup',
        resourceId: dto.alertGroupId,
        metadata: { policyId: policy.id },
      });
    }

    return { queued: true, policyId: policy.id, stepOrder: firstStep.order };
  }

  private validateSteps(steps: PagingStepDto[]) {
    if (!steps.length) {
      throw new BadRequestException('At least one paging step is required');
    }

    steps.forEach((step) => {
      step.channels.forEach((channel) => {
        if (!PagingStepDto.isValidChannel(channel)) {
          throw new BadRequestException(`Invalid paging channel: ${channel}`);
        }
      });
    });
  }

  private mapStep(step: PagingStepDto, fallbackOrder: number) {
    return {
      order: step.order ?? fallbackOrder,
      channels: step.channels,
      delaySeconds: step.delaySeconds ?? 0,
      repeatCount: step.repeatCount ?? 0,
      repeatIntervalSeconds: step.repeatIntervalSeconds ?? 0,
    };
  }
}

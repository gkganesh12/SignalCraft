import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

@Injectable()
export class EscalationPoliciesService {
  async getPolicyRules(workspaceId: string, policyId: string) {
    const prismaClient = prisma as any;
    const policy = await prismaClient.escalationPolicy.findFirst({
      where: { id: policyId, workspaceId },
      select: { rulesJson: true },
    });

    if (!policy) {
      throw new NotFoundException('Escalation policy not found');
    }

    return policy.rulesJson as Record<string, unknown>;
  }
  async listPolicies(workspaceId: string) {
    const prismaClient = prisma as any;
    const policies = await prismaClient.escalationPolicy.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    return policies.map((policy: any) => ({
      id: policy.id,
      name: policy.name,
      description: policy.description,
      rules: policy.rulesJson,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));
  }

  async getPolicy(workspaceId: string, policyId: string) {
    const prismaClient = prisma as any;
    const policy = await prismaClient.escalationPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!policy) {
      throw new NotFoundException('Escalation policy not found');
    }

    return {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      rules: policy.rulesJson,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  async createPolicy(
    workspaceId: string,
    actorId: string,
    data: { name: string; description?: string; rules: Record<string, unknown> },
  ) {
    const prismaClient = prisma as any;
    return prismaClient.escalationPolicy.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description ?? null,
        rulesJson: data.rules,
        createdBy: actorId,
      },
    });
  }

  async updatePolicy(
    workspaceId: string,
    policyId: string,
    data: { name?: string; description?: string; rules?: Record<string, unknown> },
  ) {
    const prismaClient = prisma as any;
    const existing = await prismaClient.escalationPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Escalation policy not found');
    }

    return prismaClient.escalationPolicy.update({
      where: { id: policyId },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        rulesJson: data.rules ?? undefined,
      },
    });
  }

  async deletePolicy(workspaceId: string, policyId: string) {
    const prismaClient = prisma as any;
    const existing = await prismaClient.escalationPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Escalation policy not found');
    }

    await prismaClient.escalationPolicy.delete({ where: { id: policyId } });
    return { success: true };
  }
}

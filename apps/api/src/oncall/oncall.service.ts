import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, User } from '@signalcraft/database';
import { AuditService } from '../audit/audit.service';
import {
  CreateLayerDto,
  CreateOverrideDto,
  CreateParticipantDto,
  CreateRotationDto,
  ListOverridesDto,
  UpdateOverrideDto,
  UpdateLayerDto,
  UpdateRotationDto,
} from './dto/oncall.dto';

interface RotationWithRelations {
  id: string;
  workspaceId: string;
  name: string;
  timezone: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  layers: Array<{
    id: string;
    name: string | null;
    order: number;
    handoffIntervalHours: number;
    startsAt: Date;
    endsAt: Date | null;
    restrictionsJson?: Record<string, unknown> | null;
    isShadow?: boolean | null;
    participants: Array<{
      id: string;
      position: number;
      user: {
        id: string;
        email: string;
        displayName: string | null;
      };
    }>;
  }>;
  overrides: Array<{
    id: string;
    userId: string;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
    user: {
      id: string;
      email: string;
      displayName: string | null;
    };
  }>;
}

@Injectable()
export class OnCallService {
  private readonly prismaClient = prisma as any;

  constructor(private readonly auditService: AuditService) { }

  async listRotations(workspaceId: string) {
    const rotations = (await this.prismaClient.onCallRotation.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: {
        layers: {
          orderBy: { order: 'asc' },
          include: {
            participants: {
              orderBy: { position: 'asc' },
              include: {
                user: {
                  select: { id: true, email: true, displayName: true },
                },
              },
            },
          },
        },
        overrides: {
          orderBy: { startsAt: 'desc' },
          take: 5,
          include: {
            user: {
              select: { id: true, email: true, displayName: true },
            },
          },
        },
      },
    })) as unknown as RotationWithRelations[];

    return rotations.map((rotation) => this.formatRotation(rotation));
  }

  async getRotation(workspaceId: string, rotationId: string) {
    const rotation = (await this.prismaClient.onCallRotation.findFirst({
      where: { id: rotationId, workspaceId },
      include: {
        layers: {
          orderBy: { order: 'asc' },
          include: {
            participants: {
              orderBy: { position: 'asc' },
              include: {
                user: {
                  select: { id: true, email: true, displayName: true },
                },
              },
            },
          },
        },
        overrides: {
          orderBy: { startsAt: 'desc' },
          include: {
            user: {
              select: { id: true, email: true, displayName: true },
            },
          },
        },
      },
    })) as unknown as RotationWithRelations | null;

    if (!rotation) {
      throw new NotFoundException('Rotation not found');
    }

    return this.formatRotation(rotation);
  }

  async createRotation(workspaceId: string, dto: CreateRotationDto, actor: User) {
    const rotation = await this.prismaClient.onCallRotation.create({
      data: {
        workspaceId,
        name: dto.name,
        timezone: dto.timezone ?? 'UTC',
        description: dto.description,
        createdBy: actor.id,
      },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'CREATE_ONCALL_ROTATION',
      resourceType: 'OnCallRotation',
      resourceId: rotation.id,
      metadata: { name: rotation.name },
    });

    return rotation;
  }

  async updateRotation(
    workspaceId: string,
    rotationId: string,
    dto: UpdateRotationDto,
    actor: User,
  ) {
    const existing = await this.prismaClient.onCallRotation.findFirst({
      where: { id: rotationId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Rotation not found');
    }

    const rotation = await this.prismaClient.onCallRotation.update({
      where: { id: rotationId },
      data: {
        name: dto.name ?? undefined,
        timezone: dto.timezone ?? undefined,
        description: dto.description ?? undefined,
      },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'UPDATE_ONCALL_ROTATION',
      resourceType: 'OnCallRotation',
      resourceId: rotation.id,
      metadata: { name: rotation.name },
    });

    return rotation;
  }

  async deleteRotation(workspaceId: string, rotationId: string, actor: User) {
    const existing = await this.prismaClient.onCallRotation.findFirst({
      where: { id: rotationId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Rotation not found');
    }

    await this.prismaClient.onCallRotation.delete({
      where: { id: rotationId },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'DELETE_ONCALL_ROTATION',
      resourceType: 'OnCallRotation',
      resourceId: rotationId,
      metadata: { name: existing.name },
    });

    return { success: true };
  }

  async addLayer(workspaceId: string, rotationId: string, dto: CreateLayerDto, actor: User) {
    await this.assertRotation(workspaceId, rotationId);

    const layer = await this.prismaClient.onCallLayer.create({
      data: {
        rotationId,
        name: dto.name,
        order: dto.order ?? 0,
        handoffIntervalHours: dto.handoffIntervalHours ?? 168,
        startsAt: this.toDate(dto.startsAt),
        endsAt: dto.endsAt ? this.toDate(dto.endsAt) : null,
        restrictionsJson: dto.restrictionsJson ?? null,
        isShadow: dto.isShadow ?? false,
      },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'CREATE_ONCALL_LAYER',
      resourceType: 'OnCallLayer',
      resourceId: layer.id,
      metadata: { rotationId },
    });

    return layer;
  }

  async updateLayer(
    workspaceId: string,
    rotationId: string,
    layerId: string,
    dto: UpdateLayerDto,
    actor: User,
  ) {
    await this.assertRotation(workspaceId, rotationId);
    await this.assertLayer(rotationId, layerId);

    const layer = await this.prismaClient.onCallLayer.update({
      where: { id: layerId },
      data: {
        name: dto.name ?? undefined,
        order: dto.order ?? undefined,
        handoffIntervalHours: dto.handoffIntervalHours ?? undefined,
        startsAt: dto.startsAt ? this.toDate(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? this.toDate(dto.endsAt) : undefined,
        restrictionsJson: dto.restrictionsJson ?? undefined,
        isShadow: dto.isShadow ?? undefined,
      },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'UPDATE_ONCALL_LAYER',
      resourceType: 'OnCallLayer',
      resourceId: layer.id,
      metadata: { rotationId },
    });

    return layer;
  }

  async deleteLayer(workspaceId: string, rotationId: string, layerId: string, actor: User) {
    await this.assertRotation(workspaceId, rotationId);
    await this.assertLayer(rotationId, layerId);

    await this.prismaClient.onCallLayer.delete({
      where: { id: layerId },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'DELETE_ONCALL_LAYER',
      resourceType: 'OnCallLayer',
      resourceId: layerId,
      metadata: { rotationId },
    });

    return { success: true };
  }

  async addParticipant(
    workspaceId: string,
    rotationId: string,
    layerId: string,
    dto: CreateParticipantDto,
    actor: User,
  ) {
    await this.assertRotation(workspaceId, rotationId);
    await this.assertLayer(rotationId, layerId);
    await this.assertWorkspaceUser(workspaceId, dto.userId);

    const participant = await this.prismaClient.onCallParticipant.create({
      data: {
        layerId,
        userId: dto.userId,
        position: dto.position ?? 0,
      },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'ADD_ONCALL_PARTICIPANT',
      resourceType: 'OnCallParticipant',
      resourceId: participant.id,
      metadata: { rotationId, layerId },
    });

    return participant;
  }

  async removeParticipant(
    workspaceId: string,
    rotationId: string,
    layerId: string,
    participantId: string,
    actor: User,
  ) {
    await this.assertRotation(workspaceId, rotationId);
    await this.assertLayer(rotationId, layerId);

    const existing = await this.prismaClient.onCallParticipant.findFirst({
      where: { id: participantId, layerId },
    });

    if (!existing) {
      throw new NotFoundException('Participant not found');
    }

    await this.prismaClient.onCallParticipant.delete({
      where: { id: participantId },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'REMOVE_ONCALL_PARTICIPANT',
      resourceType: 'OnCallParticipant',
      resourceId: participantId,
      metadata: { rotationId, layerId },
    });

    return { success: true };
  }

  async listOverrides(workspaceId: string, rotationId: string, filters: ListOverridesDto) {
    await this.assertRotation(workspaceId, rotationId);

    const where: Record<string, any> = { rotationId };
    if (filters.from || filters.to) {
      where.startsAt = {};
      if (filters.from) where.startsAt.gte = this.toDate(filters.from);
      if (filters.to) where.startsAt.lte = this.toDate(filters.to);
    }
    if (filters.userIds?.length) {
      where.userId = { in: filters.userIds };
    }

    const overrides = await this.prismaClient.onCallOverride.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });

    return overrides;
  }

  async addOverride(workspaceId: string, rotationId: string, dto: CreateOverrideDto, actor: User) {
    await this.assertRotation(workspaceId, rotationId);
    await this.assertWorkspaceUser(workspaceId, dto.userId);

    const startsAt = this.toDate(dto.startsAt);
    const endsAt = this.toDate(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('Override end must be after start');
    }

    const override = await this.prismaClient.onCallOverride.create({
      data: {
        rotationId,
        userId: dto.userId,
        startsAt,
        endsAt,
        reason: dto.reason,
        createdBy: actor.id,
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'CREATE_ONCALL_OVERRIDE',
      resourceType: 'OnCallOverride',
      resourceId: override.id,
      metadata: { rotationId, userId: dto.userId },
    });

    return override;
  }

  async updateOverride(
    workspaceId: string,
    rotationId: string,
    overrideId: string,
    dto: UpdateOverrideDto,
    actor: User,
  ) {
    await this.assertRotation(workspaceId, rotationId);

    const existing = await this.prismaClient.onCallOverride.findFirst({
      where: { id: overrideId, rotationId },
    });

    if (!existing) {
      throw new NotFoundException('Override not found');
    }

    if (dto.userId) {
      await this.assertWorkspaceUser(workspaceId, dto.userId);
    }

    const startsAt = dto.startsAt ? this.toDate(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? this.toDate(dto.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) {
      throw new BadRequestException('Override end must be after start');
    }

    const override = await this.prismaClient.onCallOverride.update({
      where: { id: overrideId },
      data: {
        userId: dto.userId ?? undefined,
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        reason: dto.reason ?? undefined,
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'UPDATE_ONCALL_OVERRIDE',
      resourceType: 'OnCallOverride',
      resourceId: override.id,
      metadata: { rotationId, userId: override.userId },
    });

    return override;
  }

  async removeOverride(workspaceId: string, rotationId: string, overrideId: string, actor: User) {
    await this.assertRotation(workspaceId, rotationId);

    const existing = await this.prismaClient.onCallOverride.findFirst({
      where: { id: overrideId, rotationId },
    });

    if (!existing) {
      throw new NotFoundException('Override not found');
    }

    await this.prismaClient.onCallOverride.delete({
      where: { id: overrideId },
    });

    await this.auditService.log({
      workspaceId,
      userId: actor.id,
      action: 'DELETE_ONCALL_OVERRIDE',
      resourceType: 'OnCallOverride',
      resourceId: overrideId,
      metadata: { rotationId },
    });

    return { success: true };
  }

  async getCurrentOnCall(workspaceId: string, rotationId: string) {
    const rotation = await this.prismaClient.onCallRotation.findFirst({
      where: { id: rotationId, workspaceId },
      include: {
        layers: {
          orderBy: { order: 'asc' },
          include: {
            participants: {
              orderBy: { position: 'asc' },
              include: {
                user: { select: { id: true, email: true, displayName: true } },
              },
            },
          },
        },
        overrides: {
          orderBy: { startsAt: 'desc' },
          where: {
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
          take: 1,
        },
      },
    });

    if (!rotation) {
      throw new NotFoundException('Rotation not found');
    }

    const now = new Date();

    if (rotation.overrides.length) {
      const override = rotation.overrides[0];
      return {
        rotationId: rotation.id,
        source: 'override',
        user: override.user,
        startsAt: override.startsAt,
        endsAt: override.endsAt,
      };
    }

    for (const layer of rotation.layers) {
      if (layer.isShadow) {
        continue;
      }
      const current = this.resolveLayerOnCall(layer, now);
      if (current) {
        return {
          rotationId: rotation.id,
          source: 'rotation',
          layerId: layer.id,
          user: current.user,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
        };
      }
    }

    return {
      rotationId: rotation.id,
      source: 'none',
      user: null,
    };
  }

  async getOnCallTargets(workspaceId: string, rotationId: string) {
    const rotation = await this.prismaClient.onCallRotation.findFirst({
      where: { id: rotationId, workspaceId },
      include: {
        layers: {
          orderBy: { order: 'asc' },
          include: {
            participants: {
              orderBy: { position: 'asc' },
              include: { user: { select: { id: true, email: true, displayName: true } } },
            },
          },
        },
        overrides: {
          orderBy: { startsAt: 'desc' },
          where: { startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
          include: { user: { select: { id: true, email: true, displayName: true } } },
          take: 1,
        },
      },
    });

    if (!rotation) {
      throw new NotFoundException('Rotation not found');
    }

    const now = new Date();
    let primaryUser = null as
      | RotationWithRelations['layers'][number]['participants'][number]['user']
      | null;

    if (rotation.overrides.length) {
      primaryUser = rotation.overrides[0].user;
    } else {
      for (const layer of rotation.layers) {
        if (layer.isShadow) {
          continue;
        }
        const current = this.resolveLayerOnCall(layer, now);
        if (current) {
          primaryUser = current.user;
          break;
        }
      }
    }

    const shadowUsers: RotationWithRelations['layers'][number]['participants'][number]['user'][] =
      [];
    for (const layer of rotation.layers) {
      if (!layer.isShadow) {
        continue;
      }
      const current = this.resolveLayerOnCall(layer, now);
      if (current?.user) {
        shadowUsers.push(current.user);
      }
    }

    const uniqueShadow = shadowUsers.filter(
      (user, index, arr) => arr.findIndex((entry) => entry.id === user.id) === index,
    );

    const filteredShadow = primaryUser
      ? uniqueShadow.filter((user) => user.id !== primaryUser?.id)
      : uniqueShadow;

    return {
      rotationId: rotation.id,
      primaryUser,
      shadowUsers: filteredShadow,
    };
  }

  async getSchedule(workspaceId: string, rotationId: string, from: string, to: string) {
    const rotation = (await this.prismaClient.onCallRotation.findFirst({
      where: { id: rotationId, workspaceId },
      include: {
        layers: {
          orderBy: { order: 'asc' },
          include: {
            participants: {
              orderBy: { position: 'asc' },
              include: { user: { select: { id: true, email: true, displayName: true } } },
            },
          },
        },
        overrides: {
          where: {
            OR: [
              { startsAt: { lte: new Date(to) }, endsAt: { gte: new Date(from) } },
              { startsAt: { gte: new Date(from), lte: new Date(to) } },
            ],
          },
          include: { user: { select: { id: true, email: true, displayName: true } } },
        },
      },
    })) as unknown as RotationWithRelations | null;

    if (!rotation) {
      throw new NotFoundException('Rotation not found');
    }

    const startDate = new Date(from);
    const endDate = new Date(to);
    const shifts: Array<{
      userId: string;
      displayName: string | null;
      email: string;
      startsAt: Date;
      endsAt: Date;
      source: 'rotation' | 'override';
      layerId?: string;
    }> = [];

    // Calculate rotation shifts for each layer
    for (const layer of rotation.layers) {
      if (layer.isShadow) continue;

      let current = new Date(Math.max(startDate.getTime(), layer.startsAt.getTime()));
      while (current < endDate) {
        if (layer.endsAt && current >= layer.endsAt) break;

        const resolved = this.resolveLayerOnCall(layer, current);
        if (resolved && resolved.user) {
          // If the shift is already in the list for this time/layer, skip
          // But resolveLayerOnCall gives us the exact shift window
          const shiftEnd = new Date(Math.min(resolved.endsAt.getTime(), endDate.getTime()));

          shifts.push({
            userId: resolved.user.id,
            displayName: resolved.user.displayName,
            email: resolved.user.email,
            startsAt: resolved.startsAt,
            endsAt: resolved.endsAt,
            source: 'rotation',
            layerId: layer.id,
          });

          // Jump to next shift
          current = resolved.endsAt;
        } else {
          // No shift right now, jump 1 hour and try again
          current = new Date(current.getTime() + 60 * 60 * 1000);
        }
      }
    }

    // Add overrides
    for (const override of rotation.overrides) {
      shifts.push({
        userId: override.userId,
        displayName: override.user.displayName,
        email: override.user.email,
        startsAt: override.startsAt,
        endsAt: override.endsAt,
        source: 'override',
      });
    }

    // Sort by start time
    return shifts.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  private resolveLayerOnCall(layer: RotationWithRelations['layers'][number], now: Date) {
    if (!this.isLayerActive(layer, now)) {
      return null;
    }
    if (now < layer.startsAt) {
      return null;
    }
    if (layer.endsAt && now > layer.endsAt) {
      return null;
    }
    if (!layer.participants.length) {
      return null;
    }

    const intervalMs = Math.max(layer.handoffIntervalHours, 1) * 60 * 60 * 1000;
    const elapsed = now.getTime() - layer.startsAt.getTime();
    const index = Math.floor(elapsed / intervalMs) % layer.participants.length;
    const participant = layer.participants[index];
    const shiftStart = new Date(layer.startsAt.getTime() + index * intervalMs);
    const shiftEnd = new Date(shiftStart.getTime() + intervalMs);

    return {
      user: participant.user,
      startsAt: shiftStart,
      endsAt: shiftEnd,
    };
  }

  private isLayerActive(layer: RotationWithRelations['layers'][number], now: Date) {
    const restrictions = layer.restrictionsJson as
      | { days?: string[]; startTime?: string; endTime?: string; timezone?: string }
      | null
      | undefined;

    if (!restrictions) {
      return true;
    }

    const timezone = restrictions.timezone || 'UTC';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const totalMinutes = hour * 60 + minute;

    const dayMap: Record<string, string> = {
      Sun: 'SUN',
      Mon: 'MON',
      Tue: 'TUE',
      Wed: 'WED',
      Thu: 'THU',
      Fri: 'FRI',
      Sat: 'SAT',
    };

    const today = dayMap[weekday] ?? weekday.toUpperCase();
    const days = restrictions.days?.map((day) => day.toUpperCase()) ?? null;

    const startTime = restrictions.startTime;
    const endTime = restrictions.endTime;
    if (!startTime || !endTime) {
      return days ? days.includes(today) : true;
    }

    const [startH, startM] = startTime.split(':').map((v) => Number(v));
    const [endH, endM] = endTime.split(':').map((v) => Number(v));
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const crossesMidnight = endMinutes < startMinutes;
    const inWindow = crossesMidnight
      ? totalMinutes >= startMinutes || totalMinutes <= endMinutes
      : totalMinutes >= startMinutes && totalMinutes <= endMinutes;

    if (!inWindow) {
      return false;
    }

    if (!days) {
      return true;
    }

    if (!crossesMidnight) {
      return days.includes(today);
    }

    if (totalMinutes >= startMinutes) {
      return days.includes(today);
    }

    const dayOrder = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const todayIndex = dayOrder.indexOf(today);
    const prevDay = dayOrder[(todayIndex + 6) % 7];
    return days.includes(prevDay);
  }

  private async assertRotation(workspaceId: string, rotationId: string) {
    const rotation = await this.prismaClient.onCallRotation.findFirst({
      where: { id: rotationId, workspaceId },
      select: { id: true },
    });

    if (!rotation) {
      throw new NotFoundException('Rotation not found');
    }
  }

  private async assertLayer(rotationId: string, layerId: string) {
    const layer = await this.prismaClient.onCallLayer.findFirst({
      where: { id: layerId, rotationId },
      select: { id: true },
    });

    if (!layer) {
      throw new NotFoundException('Layer not found');
    }
  }

  private async assertWorkspaceUser(workspaceId: string, userId: string) {
    const user = await this.prismaClient.user.findFirst({
      where: { id: userId, workspaceId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found in workspace');
    }
  }

  private toDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value');
    }
    return date;
  }

  private formatRotation(rotation: RotationWithRelations) {
    return {
      id: rotation.id,
      workspaceId: rotation.workspaceId,
      name: rotation.name,
      timezone: rotation.timezone,
      description: rotation.description,
      createdBy: rotation.createdBy,
      createdAt: rotation.createdAt,
      updatedAt: rotation.updatedAt,
      layers: rotation.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        order: layer.order,
        handoffIntervalHours: layer.handoffIntervalHours,
        startsAt: layer.startsAt,
        endsAt: layer.endsAt,
        restrictionsJson: layer.restrictionsJson ?? null,
        isShadow: layer.isShadow ?? false,
        participants: layer.participants.map((participant) => ({
          id: participant.id,
          position: participant.position,
          user: participant.user,
        })),
      })),
      overrides: rotation.overrides.map((override) => ({
        id: override.id,
        userId: override.userId,
        user: override.user,
        startsAt: override.startsAt,
        endsAt: override.endsAt,
        reason: override.reason,
      })),
    };
  }
}

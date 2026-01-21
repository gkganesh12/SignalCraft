import { Injectable } from '@nestjs/common';
import { prisma, AlertSeverity, Prisma, AlertStatus } from '@signalcraft/database';
import { NormalizedAlert } from '@signalcraft/shared';

export interface AlertGroupFilters {
  status?: AlertStatus[];
  severity?: AlertSeverity[];
  environment?: string[];
  project?: string[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  sortBy: 'lastSeenAt' | 'firstSeenAt' | 'severity' | 'count' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable()
export class AlertsService {
  async isDuplicate(workspaceId: string, sourceEventId: string) {
    const existing = await prisma.alertEvent.findFirst({
      where: { workspaceId, sourceEventId },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async saveAlertEvent(
    workspaceId: string,
    alert: NormalizedAlert,
    payload: Record<string, unknown>,
    alertGroupId: string,
  ) {
    return prisma.alertEvent.create({
      data: {
        workspaceId,
        alertGroupId,
        source: alert.source,
        sourceEventId: alert.sourceEventId,
        project: alert.project,
        environment: alert.environment,
        severity: this.mapSeverity(alert.severity),
        fingerprint: alert.fingerprint,
        tagsJson: alert.tags as Prisma.InputJsonValue,
        title: alert.title,
        message: alert.description,
        occurredAt: alert.occurredAt,
        payloadJson: payload as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * List alert groups with full filtering, pagination, and sorting
   */
  async listAlertGroups(
    workspaceId: string,
    filters: AlertGroupFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
    sort: SortOptions = { sortBy: 'lastSeenAt', sortOrder: 'desc' },
  ): Promise<PaginatedResult<Prisma.AlertGroupGetPayload<{ include: { assignee: true } }>>> {
    const where: Prisma.AlertGroupWhereInput = {
      workspaceId,
    };

    // Apply filters
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.severity?.length) {
      where.severity = { in: filters.severity };
    }
    if (filters.environment?.length) {
      where.environment = { in: filters.environment };
    }
    if (filters.project?.length) {
      where.project = { in: filters.project };
    }
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.startDate) {
      where.lastSeenAt = { ...where.lastSeenAt as object, gte: filters.startDate };
    }
    if (filters.endDate) {
      where.lastSeenAt = { ...where.lastSeenAt as object, lte: filters.endDate };
    }

    // Build orderBy
    const orderBy: Prisma.AlertGroupOrderByWithRelationInput = {
      [sort.sortBy]: sort.sortOrder,
    };

    // Get total count
    const total = await prisma.alertGroup.count({ where });

    // Calculate pagination
    const skip = (pagination.page - 1) * pagination.limit;
    const totalPages = Math.ceil(total / pagination.limit);

    // Get data
    const data = await prisma.alertGroup.findMany({
      where,
      orderBy,
      skip,
      take: pagination.limit,
      include: {
        assignee: true,
      },
    });

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Get detailed alert group with events and notification history
   */
  async getAlertGroupDetail(workspaceId: string, groupId: string) {
    const group = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
      include: {
        assignee: true,
        alertEvents: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
        },
        notifications: {
          orderBy: { sentAt: 'desc' },
          take: 20,
        },
      },
    });

    return group;
  }

  /**
   * Get filter options (unique values for dropdowns)
   */
  async getFilterOptions(workspaceId: string) {
    const [environments, projects] = await Promise.all([
      prisma.alertGroup.findMany({
        where: { workspaceId },
        select: { environment: true },
        distinct: ['environment'],
      }),
      prisma.alertGroup.findMany({
        where: { workspaceId },
        select: { project: true },
        distinct: ['project'],
      }),
    ]);

    return {
      environments: environments.map((e) => e.environment),
      projects: projects.map((p) => p.project),
      statuses: Object.values(AlertStatus),
      severities: Object.values(AlertSeverity),
    };
  }

  async listGroups(workspaceId: string, status?: string) {
    return prisma.alertGroup.findMany({
      where: {
        workspaceId,
        status: this.normalizeStatus(status),
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async getGroup(workspaceId: string, groupId: string) {
    return prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });
  }

  async listEvents(workspaceId: string, groupId: string) {
    return prisma.alertEvent.findMany({
      where: { workspaceId, alertGroupId: groupId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * Acknowledge an alert group
   */
  async acknowledgeAlert(workspaceId: string, groupId: string, userId?: string) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    return prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        status: AlertStatus.ACK,
        assigneeUserId: userId ?? alert.assigneeUserId,
      },
    });
  }

  /**
   * Resolve an alert group
   */
  async resolveAlert(workspaceId: string, groupId: string) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    return prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Snooze an alert group for a duration
   */
  async snoozeAlert(workspaceId: string, groupId: string, durationMinutes = 60) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    const snoozeUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    return prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        status: AlertStatus.SNOOZED,
        snoozeUntil,
      },
    });
  }

  /**
   * Update alert group (assignee, runbook, notes)
   */
  async updateAlertGroup(workspaceId: string, groupId: string, data: { assigneeUserId?: string | null; runbookUrl?: string | null }) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    return prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        ...(data.assigneeUserId !== undefined && { assigneeUserId: data.assigneeUserId }),
        ...(data.runbookUrl !== undefined && { runbookUrl: data.runbookUrl }),
      },
    });
  }

  async getWorkspaceIdByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    return user?.workspaceId ?? null;
  }

  private mapSeverity(severity: NormalizedAlert['severity']): AlertSeverity {
    switch (severity) {
      case 'critical':
        return AlertSeverity.CRITICAL;
      case 'high':
        return AlertSeverity.HIGH;
      case 'med':
        return AlertSeverity.MEDIUM;
      case 'low':
        return AlertSeverity.LOW;
      case 'info':
      default:
        return AlertSeverity.INFO;
    }
  }

  private normalizeStatus(status?: string): AlertStatus | undefined {
    if (!status) {
      return undefined;
    }
    const value = status.toUpperCase();
    if (Object.values(AlertStatus).includes(value as AlertStatus)) {
      return value as AlertStatus;
    }
    return undefined;
  }
}


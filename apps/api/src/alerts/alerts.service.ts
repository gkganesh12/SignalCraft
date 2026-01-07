import { Injectable } from '@nestjs/common';
import { prisma, AlertSeverity, Prisma, AlertStatus } from '@signalcraft/database';
import { NormalizedAlert } from '@signalcraft/shared';
import { AiService } from '../ai/ai.service';
import { AnomalyDetectionService } from './anomaly-detection.service';

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
  constructor(
    private readonly aiService: AiService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
  ) { }


  async findSimilarResolvedAlerts(alertGroup: { title: string; project: string }) {
    // Find resolved alerts with the same title or in the same project with similar keywords
    // For now, we do basic matching on exact title or specific error keywords
    // In a real app, this would use vector embeddings or full-text search
    return prisma.alertGroup.findMany({
      where: {
        project: alertGroup.project,
        status: AlertStatus.RESOLVED,
        resolutionNotes: { not: null },
        OR: [
          { title: { contains: alertGroup.title } }, // Simple containment match
          { title: { equals: alertGroup.title } },
        ],
      },
      take: 5,
      orderBy: { resolvedAt: 'desc' },
      select: {
        title: true,
        resolutionNotes: true,
        lastResolvedBy: true,
      },
    });
  }

  async getAiSuggestion(workspaceId: string, groupId: string) {
    const group = await prisma.alertGroup.findUnique({
      where: { id: groupId, workspaceId },
      include: { alertEvents: { take: 1 } },
    });

    if (!group) return null;

    if (!this.aiService.isEnabled()) {
      return { enabled: false, suggestion: null };
    }

    const pastResolutions = await this.findSimilarResolvedAlerts({
      title: group.title,
      project: group.project,
    });

    if (pastResolutions.length === 0) {
      return { enabled: true, suggestion: null };
    }

    const suggestion = await this.aiService.generateResolutionSuggestion(
      {
        title: group.title,
        description: `Severity: ${group.severity}, Environment: ${group.environment}. ${group.alertEvents[0]?.payloadJson ? JSON.stringify(group.alertEvents[0].payloadJson).slice(0, 500) : ''}`,
        environment: group.environment,
        project: group.project,
      },
      pastResolutions
    );

    return { enabled: true, suggestion };
  }

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
    const event = await prisma.alertEvent.create({
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

    // Extract and save breadcrumbs from Sentry payload
    await this.extractAndSaveBreadcrumbs(event.id, payload);

    return event;
  }

  /**
   * Extract breadcrumbs from Sentry payload and save to database
   */
  private async extractAndSaveBreadcrumbs(
    alertEventId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Sentry breadcrumbs can be in various locations
      const eventData = (this.getNestedObject(payload, 'event') ||
        this.getNestedObject(payload, 'data.event') ||
        payload) as Record<string, unknown>;

      const breadcrumbsData = this.getNestedObject(eventData as Record<string, unknown>, 'breadcrumbs.values') ||
        this.getNestedObject(eventData as Record<string, unknown>, 'breadcrumbs') ||
        this.getNestedObject(payload, 'breadcrumbs.values') ||
        this.getNestedObject(payload, 'breadcrumbs') ||
        [];

      if (!Array.isArray(breadcrumbsData) || breadcrumbsData.length === 0) {
        return;
      }

      // Limit to last 50 breadcrumbs to avoid storage issues
      const breadcrumbs = breadcrumbsData.slice(-50);

      const breadcrumbRecords = breadcrumbs.map((bc: any) => ({
        alertEventId,
        type: String(bc.type || 'default'),
        category: bc.category ? String(bc.category) : null,
        message: String(bc.message || bc.data?.message || ''),
        level: String(bc.level || 'info'),
        data: bc.data || null,
        timestamp: bc.timestamp
          ? new Date(typeof bc.timestamp === 'number' ? bc.timestamp * 1000 : bc.timestamp)
          : new Date(),
      }));

      if (breadcrumbRecords.length > 0) {
        await prisma.breadcrumb.createMany({
          data: breadcrumbRecords,
        });
      }
    } catch (error) {
      // Don't fail alert processing if breadcrumb extraction fails
      console.error('Failed to extract breadcrumbs:', error);
    }
  }

  /**
   * Safely get nested object property
   */
  private getNestedObject(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

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

    if (!group) return null;

    const isAnomalous = await this.anomalyDetectionService.checkVelocityAnomaly(
      workspaceId,
      group.id,
      group.velocityPerHour || 0
    );

    return { ...group, isAnomalous };
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

  async getAnomalies(workspaceId: string) {
    return this.anomalyDetectionService.getActiveAnomalies(workspaceId);
  }

  async getBreadcrumbs(workspaceId: string, groupId: string) {
    // Get the most recent event for this alert group
    const latestEvent = await prisma.alertEvent.findFirst({
      where: { workspaceId, alertGroupId: groupId },
      orderBy: { occurredAt: 'desc' },
    });

    if (!latestEvent) {
      return [];
    }

    // Get breadcrumbs for the latest event
    return prisma.breadcrumb.findMany({
      where: { alertEventId: latestEvent.id },
      orderBy: { timestamp: 'asc' },
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
   * Resolve an alert group with optional resolution notes and resolver identity
   */
  async resolveAlert(
    workspaceId: string,
    groupId: string,
    resolutionNotes?: string,
    resolvedBy?: string,
  ) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    const resolvedAt = new Date();

    // Calculate resolution time
    const resolutionMinutes = Math.round(
      (resolvedAt.getTime() - alert.lastSeenAt.getTime()) / (1000 * 60)
    );

    // Calculate rolling average resolution time
    const newAvgResolution = alert.avgResolutionMins
      ? Math.round((alert.avgResolutionMins + resolutionMinutes) / 2)
      : resolutionMinutes;

    return prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt,
        resolutionNotes: resolutionNotes || alert.resolutionNotes,
        lastResolvedBy: resolvedBy || alert.lastResolvedBy,
        avgResolutionMins: newAvgResolution,
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


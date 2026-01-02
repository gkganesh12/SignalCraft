import { Injectable } from '@nestjs/common';
import { prisma, AlertSeverity, Prisma } from '@signalcraft/database';
import { NormalizedAlert } from '@signalcraft/shared';

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

  async listGroups(workspaceId: string, status?: string) {
    return prisma.alertGroup.findMany({
      where: {
        workspaceId,
        status: status ? (status.toUpperCase() as Prisma.AlertStatus) : undefined,
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
      where: { workspaceId, alertGroupId: groupId } as Prisma.AlertEventWhereInput,
      orderBy: { occurredAt: 'desc' },
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
}

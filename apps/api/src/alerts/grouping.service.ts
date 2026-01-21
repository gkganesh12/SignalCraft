import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { prisma, AlertStatus, AlertSeverity } from '@signalcraft/database';
import { NormalizedAlert, AlertSeverity as NormalizedSeverity } from '@signalcraft/shared';

const severityRank: Record<NormalizedSeverity, number> = {
  info: 1,
  low: 2,
  med: 3,
  high: 4,
  critical: 5,
};

const normalizeSeverity = (severity: NormalizedSeverity): AlertSeverity => {
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
};

@Injectable()
export class GroupingService {
  private readonly windowMinutes = Number(process.env.GROUPING_WINDOW_MINUTES ?? 60);

  generateGroupKey(alert: NormalizedAlert): string {
    const rawKey = [alert.source, alert.project, alert.environment, alert.fingerprint]
      .map((value) => value.trim().toLowerCase())
      .join('|');

    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  async upsertGroup(workspaceId: string, alert: NormalizedAlert) {
    const groupKey = this.generateGroupKey(alert);
    const windowStart = new Date(Date.now() - this.windowMinutes * 60_000);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.alertGroup.findFirst({
        where: {
          workspaceId,
          groupKey,
          status: { in: [AlertStatus.OPEN, AlertStatus.ACK] },
          lastSeenAt: { gte: windowStart },
        },
      });

      if (!existing) {
        return tx.alertGroup.create({
          data: {
            workspaceId,
            groupKey,
            title: alert.title,
            severity: normalizeSeverity(alert.severity),
            environment: alert.environment,
            project: alert.project, // Phase 5: Store project for filtering
            status: AlertStatus.OPEN,
            firstSeenAt: alert.occurredAt,
            lastSeenAt: alert.occurredAt,
            count: 1,
          },
        });
      }

      const existingSeverity = this.mapSeverityRank(existing.severity);
      const incomingSeverity = severityRank[alert.severity];

      return tx.alertGroup.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: alert.occurredAt,
          count: { increment: 1 },
          severity:
            incomingSeverity > existingSeverity
              ? normalizeSeverity(alert.severity)
              : existing.severity,
        },
      });
    });
  }

  private mapSeverityRank(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return severityRank.critical;
      case AlertSeverity.HIGH:
        return severityRank.high;
      case AlertSeverity.MEDIUM:
        return severityRank.med;
      case AlertSeverity.LOW:
        return severityRank.low;
      case AlertSeverity.INFO:
      default:
        return severityRank.info;
    }
  }
}

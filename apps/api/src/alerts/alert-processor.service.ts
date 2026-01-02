import { Injectable, Logger } from '@nestjs/common';
import { NormalizationService } from './normalization.service';
import { GroupingService } from './grouping.service';
import { AlertsService } from './alerts.service';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class AlertProcessorService {
  private readonly logger = new Logger(AlertProcessorService.name);

  constructor(
    private readonly normalizationService: NormalizationService,
    private readonly groupingService: GroupingService,
    private readonly alertsService: AlertsService,
    private readonly queueService: QueueService,
  ) {}

  async processSentryEvent({
    workspaceId,
    payload,
  }: {
    workspaceId: string;
    payload: Record<string, unknown>;
  }) {
    const normalized = this.normalizationService.normalizeSentry(payload);

    const duplicate = await this.alertsService.isDuplicate(
      workspaceId,
      normalized.sourceEventId,
    );
    if (duplicate) {
      this.logger.log(`Duplicate alert ignored`, {
        workspaceId,
        sourceEventId: normalized.sourceEventId,
      });
      return { duplicate: true };
    }

    const group = await this.groupingService.upsertGroup(workspaceId, normalized);

    const event = await this.alertsService.saveAlertEvent(
      workspaceId,
      normalized,
      payload,
      group.id,
    );

    const shouldNotify = this.evaluateRoutingRules();
    if (shouldNotify) {
      await this.queueNotificationStub(workspaceId, group.id);
    }

    return { duplicate: false, groupId: group.id, eventId: event.id };
  }

  private evaluateRoutingRules() {
    this.logger.debug('Routing rules evaluation placeholder');
    return true;
  }

  private async queueNotificationStub(workspaceId: string, groupId: string) {
    try {
      await this.queueService.addJob('notifications', 'alert-created', {
        workspaceId,
        alertGroupId: groupId,
      });
    } catch (error) {
      this.logger.warn('Notification queue unavailable', { error });
    }
  }
}

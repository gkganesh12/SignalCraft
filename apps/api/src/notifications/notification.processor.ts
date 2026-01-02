import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { SlackNotificationService } from './slack-notification.service';
import { NotificationLogService } from './notification-log.service';

@Injectable()
export class NotificationProcessor implements OnModuleDestroy {
  private readonly worker?: Worker;

  constructor(
    private readonly slackService: SlackNotificationService,
    private readonly logService: NotificationLogService,
  ) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return;
    }
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.worker = new Worker(
      'notifications',
      async (job) => {
        const { workspaceId, alertGroupId } = job.data as {
          workspaceId: string;
          alertGroupId: string;
        };

        const result = await this.slackService.sendAlert(workspaceId, alertGroupId);
        await this.logService.logSuccess(workspaceId, result.channelId, alertGroupId);
        return result;
      },
      { connection },
    );

    this.worker.on('failed', async (job, err) => {
      if (!job) {
        return;
      }
      const { workspaceId, alertGroupId, channelId } = job.data as {
        workspaceId: string;
        alertGroupId: string;
        channelId?: string;
      };
      await this.logService.logFailure(
        workspaceId,
        channelId ?? 'unknown',
        alertGroupId,
        err.message,
      );
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}

import { Module } from '@nestjs/common';
import { NotificationLogService } from './notification-log.service';
import { SlackNotificationService } from './slack-notification.service';
import { NotificationProcessor } from './notification.processor';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsController } from './notifications.controller';
import { AiModule } from '../ai/ai.module';
import { AlertsModule } from '../alerts/alerts.module';
import { forwardRef } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Module({
  imports: [
    IntegrationsModule,
    AiModule,
    forwardRef(() => AlertsModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationLogService,
    SlackNotificationService,
    NotificationProcessor,
    EmailNotificationService,
    WebhookDispatcherService,
  ],
  exports: [
    SlackNotificationService,
    NotificationLogService,
    EmailNotificationService,
    WebhookDispatcherService,
  ],
})
export class NotificationsModule { }

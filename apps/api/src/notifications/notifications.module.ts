import { Module } from '@nestjs/common';
import { NotificationLogService } from './notification-log.service';
import { SlackNotificationService } from './slack-notification.service';
import { NotificationProcessor } from './notification.processor';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [IntegrationsModule],
  controllers: [NotificationsController],
  providers: [NotificationLogService, SlackNotificationService, NotificationProcessor],
  exports: [SlackNotificationService, NotificationLogService],
})
export class NotificationsModule { }

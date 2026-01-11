import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { SlackActionsController } from './slack-actions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AlertsModule, NotificationsModule],
  controllers: [WebhooksController, SlackActionsController],
})
export class WebhooksModule {}

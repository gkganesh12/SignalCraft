import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

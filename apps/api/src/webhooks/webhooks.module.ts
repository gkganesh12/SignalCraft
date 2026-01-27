import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { SlackActionsController } from './slack-actions.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhookIngestionController } from './ingestion.controller';
import { WebhookIngestionService } from './webhook-ingestion.service';
import { AwsCloudWatchStrategy } from './strategies/aws-cloudwatch.strategy';
import { PrometheusAlertmanagerStrategy } from './strategies/prometheus.strategy';
import { GenericWebhookStrategy } from './strategies/generic-webhook.strategy';
import { SecretsModule } from '../common/secrets/secrets.module';
import { JiraWebhookController } from './jira-webhook.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AzureMonitorStrategy } from './strategies/azure-monitor.strategy';
import { GcpMonitoringStrategy } from './strategies/gcp-monitoring.strategy';
import { GrafanaAlertStrategy } from './strategies/grafana.strategy';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [AlertsModule, NotificationsModule, SecretsModule, IntegrationsModule, SyncModule],
  controllers: [
    WebhooksController,
    SlackActionsController,
    WebhookIngestionController,
    JiraWebhookController,
  ],
  providers: [
    WebhookIngestionService,
    AwsCloudWatchStrategy,
    PrometheusAlertmanagerStrategy,
    GenericWebhookStrategy,
    AzureMonitorStrategy,
    GcpMonitoringStrategy,
    GrafanaAlertStrategy,
  ],
})
export class WebhooksModule { }

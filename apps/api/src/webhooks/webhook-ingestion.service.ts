import { Injectable } from '@nestjs/common';
import { SecretsService } from '../common/secrets/secrets.service';
import {
  AuthenticationException,
  ConfigurationException,
} from '../common/exceptions/base.exception';
import { AwsCloudWatchStrategy } from './strategies/aws-cloudwatch.strategy';
import { GenericWebhookStrategy } from './strategies/generic-webhook.strategy';
import { PrometheusAlertmanagerStrategy } from './strategies/prometheus.strategy';
import { AzureMonitorStrategy } from './strategies/azure-monitor.strategy';
import { GcpMonitoringStrategy } from './strategies/gcp-monitoring.strategy';
import { GrafanaAlertStrategy } from './strategies/grafana.strategy';
import {
  WebhookIngestionResult,
  WebhookIngestionStrategy,
} from './strategies/webhook-ingestion.strategy';

interface IngestRequest {
  workspaceId: string;
  source: string;
  payload: Record<string, unknown>;
  token?: string;
}

@Injectable()
export class WebhookIngestionService {
  private readonly strategies: WebhookIngestionStrategy[];

  constructor(
    awsStrategy: AwsCloudWatchStrategy,
    prometheusStrategy: PrometheusAlertmanagerStrategy,
    genericStrategy: GenericWebhookStrategy,
    azureStrategy: AzureMonitorStrategy,
    gcpStrategy: GcpMonitoringStrategy,
    grafanaStrategy: GrafanaAlertStrategy,
    private readonly secretsService: SecretsService,
  ) {
    this.strategies = [
      awsStrategy,
      prometheusStrategy,
      genericStrategy,
      azureStrategy,
      gcpStrategy,
      grafanaStrategy,
    ];
  }

  async ingest({ workspaceId, source, payload, token }: IngestRequest) {
    await this.verifyTokenIfConfigured(workspaceId, source, token);

    const strategy = this.strategies.find((item) => item.canHandle(source));
    if (!strategy) {
      throw new ConfigurationException(`Unsupported webhook source: ${source}`);
    }

    const results = await strategy.ingest({ workspaceId, payload });
    const summary = this.summarize(results);

    return {
      status: 'ok',
      source,
      ...summary,
    };
  }

  private summarize(results: WebhookIngestionResult[]) {
    const summary = {
      total: results.length,
      duplicates: 0,
      processed: 0,
      notificationsQueued: 0,
    };

    for (const result of results) {
      if (result.duplicate) {
        summary.duplicates += 1;
      } else {
        summary.processed += 1;
      }
      summary.notificationsQueued += result.notificationsQueued ?? 0;
    }

    return summary;
  }

  private async verifyTokenIfConfigured(
    workspaceId: string,
    source: string,
    receivedToken?: string,
  ) {
    const secretName = this.getSecretName(source, workspaceId);
    const envFallback = this.getEnvFallback(source);

    let secret: string | null = null;
    if (secretName) {
      try {
        secret = await this.secretsService.getSecret(secretName);
      } catch (_error) {
        secret = envFallback ? (process.env[envFallback] ?? null) : null;
      }
    }

    if (!secret) {
      return;
    }

    if (!receivedToken || receivedToken !== secret) {
      throw new AuthenticationException('Invalid webhook token');
    }
  }

  private getSecretName(source: string, workspaceId: string): string | null {
    switch (source) {
      case 'aws-cloudwatch':
      case 'AWS_CLOUDWATCH':
        return `signalcraft/${workspaceId}/aws-cloudwatch-token`;
      case 'prometheus':
      case 'PROMETHEUS':
        return `signalcraft/${workspaceId}/prometheus-token`;
      case 'azure-monitor':
      case 'AZURE_MONITOR':
        return `signalcraft/${workspaceId}/azure-monitor-token`;
      case 'gcp-monitoring':
      case 'GCP_MONITORING':
        return `signalcraft/${workspaceId}/gcp-monitoring-token`;
      case 'grafana':
      case 'GRAFANA':
        return `signalcraft/${workspaceId}/grafana-token`;
      case 'generic':
      case 'GENERIC_WEBHOOK':
        return `signalcraft/${workspaceId}/generic-webhook-token`;
      default:
        return null;
    }
  }

  private getEnvFallback(source: string): string | null {
    switch (source) {
      case 'aws-cloudwatch':
      case 'AWS_CLOUDWATCH':
        return 'AWS_CLOUDWATCH_WEBHOOK_TOKEN';
      case 'prometheus':
      case 'PROMETHEUS':
        return 'PROMETHEUS_WEBHOOK_TOKEN';
      case 'azure-monitor':
      case 'AZURE_MONITOR':
        return 'AZURE_MONITOR_WEBHOOK_TOKEN';
      case 'gcp-monitoring':
      case 'GCP_MONITORING':
        return 'GCP_MONITORING_WEBHOOK_TOKEN';
      case 'grafana':
      case 'GRAFANA':
        return 'GRAFANA_WEBHOOK_TOKEN';
      case 'generic':
      case 'GENERIC_WEBHOOK':
        return 'GENERIC_WEBHOOK_TOKEN';
      default:
        return null;
    }
  }
}

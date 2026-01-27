import { Injectable, Logger } from '@nestjs/common';
import { prisma, IntegrationType, IntegrationStatus, WebhookRegistry } from '@signalcraft/database';
import { WebhookStrategy } from './webhook.strategy';
import { AwsCloudWatchStrategy } from './strategies/aws-cloudwatch.strategy';
import { PrometheusStrategy } from './strategies/prometheus.strategy';
import { GenericWebhookStrategy } from './strategies/generic-webhook.strategy';
import { GrafanaWebhookStrategy } from './strategies/grafana.strategy';
import { AzureMonitorStrategy } from './strategies/azure-monitor.strategy';
import { GcpMonitoringStrategy } from './strategies/gcp-monitoring.strategy';
import { WebhookRegistryService } from './webhook-registry.service';

@Injectable()
export class WebhookIngestionService {
  private readonly logger = new Logger(WebhookIngestionService.name);
  private readonly strategies: Map<IntegrationType, WebhookStrategy> = new Map();

  constructor(
    private readonly awsStrategy: AwsCloudWatchStrategy,
    private readonly prometheusStrategy: PrometheusStrategy,
    private readonly grafanaStrategy: GrafanaWebhookStrategy,
    private readonly azureStrategy: AzureMonitorStrategy,
    private readonly gcpStrategy: GcpMonitoringStrategy,
    private readonly genericStrategy: GenericWebhookStrategy,
    private readonly registryService: WebhookRegistryService,
  ) {
    this.strategies.set(IntegrationType.AWS_CLOUDWATCH, awsStrategy);
    this.strategies.set(IntegrationType.PROMETHEUS, prometheusStrategy);
    this.strategies.set(IntegrationType.GRAFANA, grafanaStrategy);
    this.strategies.set(IntegrationType.AZURE_MONITOR, azureStrategy);
    this.strategies.set(IntegrationType.GCP_MONITORING, gcpStrategy);
    this.strategies.set(IntegrationType.GENERIC_WEBHOOK, genericStrategy);
  }

  async processWebhook(
    type: IntegrationType,
    payload: any,
    headers: Record<string, string>,
    token?: string,
  ) {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`No strategy found for integration type: ${type}`);
    }

    // Lookup registry config if token is provided
    let config: WebhookRegistry | null = null;
    if (token) {
      config = await this.registryService.findByToken(token);
    }

    // Parse with potential config (like JSONPath mappings for generic webhooks)
    const normalized = await strategy.parse(payload, headers, config);
    if (!normalized) {
      this.logger.warn(`Webhook payload parsed to null for ${type}`);
      return null;
    }

    return normalized;
  }

  async resolveWorkspaceId(type: IntegrationType, token?: string): Promise<string> {
    if (!token) {
      this.logger.error(`Attempted webhook access without token for ${type}`);
      throw new Error('Missing integration token');
    }

    // 1. Try WebhookRegistry first (Phase 4 style)
    const registry = await this.registryService.findByToken(token);
    if (registry && registry.enabled) {
      return registry.workspaceId;
    }

    // 2. Fallback to old style Integration model for backward compatibility
    const integration = await prisma.integration.findFirst({
      where: { id: token, type, status: IntegrationStatus.ACTIVE },
      select: { workspaceId: true },
    });

    if (!integration) {
      this.logger.error(`Invalid token ${token} for ${type}`);
      throw new Error('Invalid or disabled integration token');
    }

    return integration.workspaceId;
  }
}

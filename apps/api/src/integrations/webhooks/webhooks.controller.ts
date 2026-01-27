import { Controller, Post, Body, Headers, Query, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { IntegrationType } from '@signalcraft/database';
import { NormalizedAlert as SharedNormalizedAlert } from '@signalcraft/shared';
import { WebhookIngestionService } from './webhook-ingestion.service';
import { AlertProcessorService } from '../../alerts/alert-processor.service';
import { NormalizedAlert as WebhookNormalizedAlert } from './webhook.strategy';

@ApiTags('Inbound Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly ingestionService: WebhookIngestionService,
    private readonly alertProcessor: AlertProcessorService,
  ) {}

  @Post(':type')
  @ApiOperation({ summary: 'Receive generic inbound webhook' })
  @ApiParam({
    name: 'type',
    enum: IntegrationType,
    description: 'Type of integration (e.g., aws_cloudwatch, prometheus)',
  })
  async receiveWebhook(
    @Param('type') type: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
    @Query('token') token?: string,
  ) {
    this.logger.log(`Received webhook for type: ${type}`);

    // Convert URL param to Enum
    const integrationType = type.toUpperCase() as IntegrationType;
    if (!Object.values(IntegrationType).includes(integrationType)) {
      return { status: 'error', message: `Unsupported integration type: ${type}` };
    }

    try {
      const result = await this.ingestionService.processWebhook(
        integrationType,
        payload,
        headers,
        token,
      );
      if (!result) {
        return { status: 'ignored', message: 'Payload parsed to null or ignored' };
      }

      const workspaceId = await this.ingestionService.resolveWorkspaceId(integrationType, token);
      const normalized = this.mapToSharedNormalized(result, integrationType);
      const processing = (await this.alertProcessor.processNormalizedAlert({
        workspaceId,
        normalized,
        payload: payload as Record<string, unknown>,
      })) as unknown as Record<string, unknown>;

      return {
        status: 'received',
        message: 'Webhook processed successfully',
        data: {
          normalized,
          processing,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to process webhook: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  private mapToSharedNormalized(
    normalized: WebhookNormalizedAlert,
    source: IntegrationType,
  ): SharedNormalizedAlert {
    const tags = normalized.tags ?? {};
    const project = tags.project || tags.service || tags.app || tags.job || 'default';
    const environment = tags.environment || tags.env || tags.stage || tags.cluster || 'default';
    const sourceEventId = normalized.sourceEventId || `${Date.now()}`;
    const description = normalized.description || normalized.message || normalized.title;

    return {
      source,
      sourceEventId,
      project,
      environment,
      severity: normalized.severity,
      fingerprint: sourceEventId,
      title: normalized.title,
      description,
      tags,
      occurredAt: new Date(),
      link: normalized.link ?? null,
      userCount: null,
    };
  }
}

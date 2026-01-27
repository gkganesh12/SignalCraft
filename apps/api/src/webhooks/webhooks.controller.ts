import { Body, Controller, Headers, Logger, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import crypto from 'crypto';
import { AlertProcessorService } from '../alerts/alert-processor.service';
import { AlertsService } from '../alerts/alerts.service';
import { ExternalMappingsService } from '../sync/external-mappings.service';
import { IntegrationType } from '@signalcraft/database';
import { SentryWebhookDto, DatadogWebhookDto } from './dto/ingest-webhook.dto';
import { SecretsService } from '../common/secrets/secrets.service';
import {
  ValidationException,
  AuthenticationException,
  ConfigurationException,
} from '../common/exceptions/base.exception';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly alertProcessor: AlertProcessorService,
    private readonly secretsService: SecretsService,
    private readonly alertsService: AlertsService,
    private readonly externalMappingsService: ExternalMappingsService,
  ) {}

  /**
   * Sentry webhook endpoint with automated validation
   */
  @Post('sentry')
  @ApiOperation({
    summary: 'Ingest Sentry webhook',
    description: 'Receives and processes alerts from Sentry. Requires signature verification.',
  })
  @ApiHeader({
    name: 'x-sentry-hook-signature',
    description: 'Cryptographic signature from Sentry',
    required: true,
  })
  @ApiHeader({ name: 'x-workspace-id', description: 'SignalCraft Workspace ID', required: false })
  @ApiQuery({
    name: 'workspaceId',
    description: 'SignalCraft Workspace ID (can be in query or header)',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid signature or authentication failure' })
  @ApiResponse({ status: 422, description: 'Missing workspaceId or validation failed' })
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 requests per minute
  async handleSentryWebhook(
    @Req() req: { body: Buffer },
    @Body() payload: SentryWebhookDto,
    @Headers('x-sentry-hook-signature') signature: string | undefined,
    @Headers('x-workspace-id') workspaceHeader: string | undefined,
    @Query('workspaceId') workspaceQuery: string | undefined,
  ) {
    const workspaceId = workspaceHeader ?? workspaceQuery;
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    const rawBody = req.body?.toString('utf8') ?? '';

    // ✅ SECURE: Verify signature using secret from AWS Secrets Manager
    await this.verifySentrySignature(workspaceId, rawBody, signature);

    this.logger.log(`Sentry webhook received`, {
      workspaceId,
      payloadSize: rawBody.length,
    });

    const result = await this.alertProcessor.processSentryEvent({
      workspaceId,
      payload: payload as unknown as Record<string, unknown>,
    });

    return { status: 'ok', ...result };
  }

  /**
   * Datadog webhook endpoint with automated validation
   */
  @Post('datadog')
  @ApiOperation({
    summary: 'Ingest Datadog webhook',
    description: 'Receives and processes alerts from Datadog. Requires token verification.',
  })
  @ApiHeader({ name: 'x-datadog-token', description: 'Auth token from Datadog', required: false })
  @ApiQuery({
    name: 'token',
    description: 'Auth token from Datadog (can be in query or header)',
    required: false,
  })
  @ApiQuery({ name: 'workspaceId', description: 'SignalCraft Workspace ID', required: true })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid token or authentication failure' })
  @ApiResponse({ status: 422, description: 'Missing workspaceId or validation failed' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handleDatadogWebhook(
    @Body() payload: DatadogWebhookDto,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-datadog-token') tokenHeader: string | undefined,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    // ✅ SECURE: Verify token using secret from AWS Secrets Manager
    await this.verifyDatadogToken(workspaceId, tokenQuery ?? tokenHeader);

    this.logger.log(`Datadog webhook received`, { workspaceId });

    const result = await this.alertProcessor.processDatadogEvent({
      workspaceId,
      payload: payload as unknown as Record<string, unknown>,
    });

    return { status: 'ok', ...result };
  }

  @Post('pagerduty')
  @ApiOperation({
    summary: 'Ingest PagerDuty webhook',
    description: 'Receives and processes PagerDuty incident updates.',
  })
  @ApiQuery({ name: 'token', description: 'Auth token (query or header)', required: false })
  @ApiQuery({ name: 'workspaceId', description: 'SignalCraft Workspace ID', required: false })
  @ApiHeader({ name: 'x-pagerduty-token', description: 'Auth token', required: false })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePagerDutyWebhook(
    @Body() payload: Record<string, unknown>,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-pagerduty-token') tokenHeader: string | undefined,
    @Query('workspaceId') workspaceIdQuery: string | undefined,
  ) {
    const incidentId = this.extractPagerDutyIncidentId(payload);
    if (!incidentId) {
      return { status: 'ignored', reason: 'missing_incident_id' };
    }

    const mapping = await this.externalMappingsService.findByExternalId({
      integrationType: IntegrationType.PAGERDUTY,
      externalId: incidentId,
    });

    const workspaceId = workspaceIdQuery ?? mapping?.alertGroup?.workspaceId;
    if (!workspaceId) {
      return { status: 'ignored', reason: 'workspace_not_found' };
    }

    await this.verifyPagerDutyToken(workspaceId, tokenQuery ?? tokenHeader);

    const action = this.extractPagerDutyAction(payload);
    if (!mapping?.alertGroupId || !action) {
      return { status: 'ignored', reason: 'mapping_not_found' };
    }

    if (action === 'acknowledged') {
      await this.alertsService.acknowledgeAlert(
        workspaceId,
        mapping.alertGroupId,
        undefined,
        'integration:pagerduty',
      );
    }

    if (action === 'resolved') {
      await this.alertsService.resolveAlert(
        workspaceId,
        mapping.alertGroupId,
        'Resolved via PagerDuty',
        undefined,
        'integration:pagerduty',
      );
    }

    return { status: 'ok' };
  }

  @Post('opsgenie')
  @ApiOperation({
    summary: 'Ingest Opsgenie webhook',
    description: 'Receives and processes Opsgenie alert updates.',
  })
  @ApiQuery({ name: 'token', description: 'Auth token (query or header)', required: false })
  @ApiQuery({ name: 'workspaceId', description: 'SignalCraft Workspace ID', required: false })
  @ApiHeader({ name: 'x-opsgenie-token', description: 'Auth token', required: false })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleOpsgenieWebhook(
    @Body() payload: Record<string, unknown>,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-opsgenie-token') tokenHeader: string | undefined,
    @Query('workspaceId') workspaceIdQuery: string | undefined,
  ) {
    const alertId = this.extractOpsgenieAlertId(payload);
    if (!alertId) {
      return { status: 'ignored', reason: 'missing_alert_id' };
    }

    const mapping = await this.externalMappingsService.findByExternalId({
      integrationType: IntegrationType.OPSGENIE,
      externalId: alertId,
    });

    const workspaceId = workspaceIdQuery ?? mapping?.alertGroup?.workspaceId;
    if (!workspaceId) {
      return { status: 'ignored', reason: 'workspace_not_found' };
    }

    await this.verifyOpsgenieToken(workspaceId, tokenQuery ?? tokenHeader);

    const action = this.extractOpsgenieAction(payload);
    if (!mapping?.alertGroupId || !action) {
      return { status: 'ignored', reason: 'mapping_not_found' };
    }

    if (action === 'acknowledged') {
      await this.alertsService.acknowledgeAlert(
        workspaceId,
        mapping.alertGroupId,
        undefined,
        'integration:opsgenie',
      );
    }

    if (action === 'resolved') {
      await this.alertsService.resolveAlert(
        workspaceId,
        mapping.alertGroupId,
        'Resolved via Opsgenie',
        undefined,
        'integration:opsgenie',
      );
    }

    return { status: 'ok' };
  }

  private async verifySentrySignature(workspaceId: string, rawBody: string, signature?: string) {
    let secret: string;
    try {
      // ✅ RETRIEVE FROM SECRETS MANAGER
      secret = await this.secretsService.getSecret(`signalcraft/${workspaceId}/sentry-secret`);
    } catch (error) {
      // Fallback to env if secret manager fails or secret not found (migration period)
      secret = process.env.SENTRY_WEBHOOK_SECRET ?? '';
      if (!secret) {
        throw new ConfigurationException('Sentry secret not configured', 'SENTRY_WEBHOOK_SECRET');
      }
      this.logger.warn(
        `Sentry secret not found in Secrets Manager for ${workspaceId}, using fallback`,
      );
    }

    if (!signature) {
      throw new AuthenticationException('Missing Sentry signature');
    }

    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature);

    if (
      digestBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(digestBuffer, signatureBuffer)
    ) {
      throw new AuthenticationException('Invalid Sentry signature');
    }
  }

  private async verifyDatadogToken(workspaceId: string, receivedToken?: string) {
    let secret: string;
    try {
      // ✅ RETRIEVE FROM SECRETS MANAGER
      secret = await this.secretsService.getSecret(`signalcraft/${workspaceId}/datadog-token`);
    } catch (error) {
      secret = process.env.DATADOG_WEBHOOK_SECRET ?? '';
      if (!secret) {
        throw new ConfigurationException('Datadog token not configured', 'DATADOG_WEBHOOK_SECRET');
      }
      this.logger.warn(
        `Datadog token not found in Secrets Manager for ${workspaceId}, using fallback`,
      );
    }

    if (!receivedToken || receivedToken !== secret) {
      throw new AuthenticationException('Invalid Datadog token');
    }
  }

  private async verifyPagerDutyToken(workspaceId: string, receivedToken?: string) {
    let secret: string;
    try {
      secret = await this.secretsService.getSecret(`signalcraft/${workspaceId}/pagerduty-token`);
    } catch (error) {
      secret = process.env.PAGERDUTY_WEBHOOK_SECRET ?? '';
      if (!secret) {
        return;
      }
    }

    if (!receivedToken || receivedToken !== secret) {
      throw new AuthenticationException('Invalid PagerDuty token');
    }
  }

  private async verifyOpsgenieToken(workspaceId: string, receivedToken?: string) {
    let secret: string;
    try {
      secret = await this.secretsService.getSecret(`signalcraft/${workspaceId}/opsgenie-token`);
    } catch (error) {
      secret = process.env.OPSGENIE_WEBHOOK_SECRET ?? '';
      if (!secret) {
        return;
      }
    }

    if (!receivedToken || receivedToken !== secret) {
      throw new AuthenticationException('Invalid Opsgenie token');
    }
  }

  private extractPagerDutyIncidentId(payload: Record<string, unknown>): string | null {
    const event = (payload as any).event ?? payload;
    const incident = event?.data?.incident ?? event?.incident ?? payload?.incident ?? {};
    return incident?.id ? String(incident.id) : null;
  }

  private extractPagerDutyAction(
    payload: Record<string, unknown>,
  ): 'acknowledged' | 'resolved' | null {
    const event = (payload as any).event ?? payload;
    const eventType = String(event?.event_type || event?.type || '').toLowerCase();
    if (eventType.includes('acknowledged')) {
      return 'acknowledged';
    }
    if (eventType.includes('resolved')) {
      return 'resolved';
    }
    return null;
  }

  private extractOpsgenieAlertId(payload: Record<string, unknown>): string | null {
    const alert = (payload as any).alert ?? payload;
    return alert?.alertId
      ? String(alert.alertId)
      : (payload as any).alertId
        ? String((payload as any).alertId)
        : null;
  }

  private extractOpsgenieAction(
    payload: Record<string, unknown>,
  ): 'acknowledged' | 'resolved' | null {
    const action = String((payload as any).action || (payload as any).status || '').toLowerCase();
    if (action.includes('acknowledged')) {
      return 'acknowledged';
    }
    if (action.includes('resolved') || action.includes('closed') || action.includes('close')) {
      return 'resolved';
    }
    return null;
  }
}

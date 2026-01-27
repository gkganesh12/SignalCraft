import { Body, Controller, Headers, Logger, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ValidationException } from '../common/exceptions/base.exception';
import { WebhookIngestionService } from './webhook-ingestion.service';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhookIngestionController {
  private readonly logger = new Logger(WebhookIngestionController.name);

  constructor(private readonly ingestionService: WebhookIngestionService) {}

  @Post('aws-cloudwatch')
  @ApiOperation({
    summary: 'Ingest AWS CloudWatch (SNS) webhook',
    description: 'Receives and processes AWS CloudWatch alarms via SNS webhook.',
  })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'token', required: false })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handleAwsCloudWatch(
    @Body() payload: Record<string, unknown>,
    @Query('workspaceId') workspaceId: string,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-webhook-token') tokenHeader: string | undefined,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    this.logger.log('AWS CloudWatch webhook received', { workspaceId });

    return this.ingestionService.ingest({
      workspaceId,
      source: 'aws-cloudwatch',
      payload,
      token: tokenQuery ?? tokenHeader,
    });
  }

  @Post('prometheus')
  @ApiOperation({
    summary: 'Ingest Prometheus Alertmanager webhook',
    description: 'Receives and processes Prometheus Alertmanager alerts.',
  })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'token', required: false })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handlePrometheus(
    @Body() payload: Record<string, unknown>,
    @Query('workspaceId') workspaceId: string,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-webhook-token') tokenHeader: string | undefined,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    this.logger.log('Prometheus webhook received', { workspaceId });

    return this.ingestionService.ingest({
      workspaceId,
      source: 'prometheus',
      payload,
      token: tokenQuery ?? tokenHeader,
    });
  }

  @Post('azure-monitor')
  @ApiOperation({
    summary: 'Ingest Azure Monitor webhook',
    description: 'Receives and processes Azure Monitor alerts using the common alert schema.',
  })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'token', required: false })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handleAzureMonitor(
    @Body() payload: Record<string, unknown>,
    @Query('workspaceId') workspaceId: string,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-webhook-token') tokenHeader: string | undefined,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    this.logger.log('Azure Monitor webhook received', { workspaceId });

    return this.ingestionService.ingest({
      workspaceId,
      source: 'azure-monitor',
      payload,
      token: tokenQuery ?? tokenHeader,
    });
  }

  @Post('gcp-monitoring')
  @ApiOperation({
    summary: 'Ingest GCP Monitoring webhook',
    description: 'Receives and processes Google Cloud Monitoring alerts.',
  })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'token', required: false })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handleGcpMonitoring(
    @Body() payload: Record<string, unknown>,
    @Query('workspaceId') workspaceId: string,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-webhook-token') tokenHeader: string | undefined,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    this.logger.log('GCP Monitoring webhook received', { workspaceId });

    return this.ingestionService.ingest({
      workspaceId,
      source: 'gcp-monitoring',
      payload,
      token: tokenQuery ?? tokenHeader,
    });
  }

  @Post('grafana')
  @ApiOperation({
    summary: 'Ingest Grafana webhook',
    description: 'Receives and processes Grafana alert webhook payloads.',
  })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'token', required: false })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handleGrafana(
    @Body() payload: Record<string, unknown>,
    @Query('workspaceId') workspaceId: string,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-webhook-token') tokenHeader: string | undefined,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    this.logger.log('Grafana webhook received', { workspaceId });

    return this.ingestionService.ingest({
      workspaceId,
      source: 'grafana',
      payload,
      token: tokenQuery ?? tokenHeader,
    });
  }

  @Post(':source')
  @ApiOperation({
    summary: 'Generic webhook ingestor',
    description: 'Receives and processes webhook payloads based on source type.',
  })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'token', required: false })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handleGeneric(
    @Body() payload: Record<string, unknown>,
    @Param('source') source: string,
    @Query('workspaceId') workspaceId: string,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-webhook-token') tokenHeader: string | undefined,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    return this.ingestionService.ingest({
      workspaceId,
      source,
      payload,
      token: tokenQuery ?? tokenHeader,
    });
  }
}

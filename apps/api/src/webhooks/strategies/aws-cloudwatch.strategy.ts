import { Injectable, Logger } from '@nestjs/common';
import { AlertProcessorService } from '../../alerts/alert-processor.service';
import { NormalizationService } from '../../alerts/normalization.service';
import {
  WebhookIngestionContext,
  WebhookIngestionResult,
  WebhookIngestionStrategy,
} from './webhook-ingestion.strategy';

@Injectable()
export class AwsCloudWatchStrategy implements WebhookIngestionStrategy {
  readonly source = 'aws-cloudwatch';
  private readonly logger = new Logger(AwsCloudWatchStrategy.name);

  constructor(
    private readonly alertProcessor: AlertProcessorService,
    private readonly normalizationService: NormalizationService,
  ) {}

  canHandle(source: string): boolean {
    return source === this.source || source === 'AWS_CLOUDWATCH';
  }

  async ingest({
    workspaceId,
    payload,
  }: WebhookIngestionContext): Promise<WebhookIngestionResult[]> {
    const messageType = String(payload.Type ?? payload.type ?? '').toLowerCase();
    if (messageType.includes('subscriptionconfirmation')) {
      this.logger.warn(
        'AWS SNS subscription confirmation received. Manual confirmation required.',
        {
          workspaceId,
        },
      );
      return [{ duplicate: false }];
    }

    const normalized = this.normalizationService.normalizeAwsCloudWatch(payload);
    const result = await this.alertProcessor.processNormalizedAlert({
      workspaceId,
      normalized,
      payload,
    });
    return [result];
  }
}

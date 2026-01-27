import { Injectable } from '@nestjs/common';
import { AlertProcessorService } from '../../alerts/alert-processor.service';
import { NormalizationService } from '../../alerts/normalization.service';
import {
  WebhookIngestionContext,
  WebhookIngestionResult,
  WebhookIngestionStrategy,
} from './webhook-ingestion.strategy';

@Injectable()
export class GcpMonitoringStrategy implements WebhookIngestionStrategy {
  readonly source = 'gcp-monitoring';

  constructor(
    private readonly alertProcessor: AlertProcessorService,
    private readonly normalizationService: NormalizationService,
  ) {}

  canHandle(source: string): boolean {
    return source === this.source || source === 'GCP_MONITORING';
  }

  async ingest({
    workspaceId,
    payload,
  }: WebhookIngestionContext): Promise<WebhookIngestionResult[]> {
    const normalized = this.normalizationService.normalizeGcpMonitoring(payload);
    const result = await this.alertProcessor.processNormalizedAlert({
      workspaceId,
      normalized,
      payload,
    });
    return [result];
  }
}

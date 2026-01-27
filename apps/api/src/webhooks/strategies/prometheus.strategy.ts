import { Injectable } from '@nestjs/common';
import { AlertProcessorService } from '../../alerts/alert-processor.service';
import { NormalizationService } from '../../alerts/normalization.service';
import {
  WebhookIngestionContext,
  WebhookIngestionResult,
  WebhookIngestionStrategy,
} from './webhook-ingestion.strategy';

@Injectable()
export class PrometheusAlertmanagerStrategy implements WebhookIngestionStrategy {
  readonly source = 'prometheus';

  constructor(
    private readonly alertProcessor: AlertProcessorService,
    private readonly normalizationService: NormalizationService,
  ) {}

  canHandle(source: string): boolean {
    return source === this.source || source === 'PROMETHEUS';
  }

  async ingest({
    workspaceId,
    payload,
  }: WebhookIngestionContext): Promise<WebhookIngestionResult[]> {
    const result = await this.alertProcessor.processPrometheusEvent({
      workspaceId,
      payload,
    });

    return [result];
  }
}

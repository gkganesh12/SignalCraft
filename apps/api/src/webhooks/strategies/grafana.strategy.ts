import { Injectable } from '@nestjs/common';
import { AlertProcessorService } from '../../alerts/alert-processor.service';
import { NormalizationService } from '../../alerts/normalization.service';
import {
  WebhookIngestionContext,
  WebhookIngestionResult,
  WebhookIngestionStrategy,
} from './webhook-ingestion.strategy';

@Injectable()
export class GrafanaAlertStrategy implements WebhookIngestionStrategy {
  readonly source = 'grafana';

  constructor(
    private readonly alertProcessor: AlertProcessorService,
    private readonly normalizationService: NormalizationService,
  ) {}

  canHandle(source: string): boolean {
    return source === this.source || source === 'GRAFANA';
  }

  async ingest({
    workspaceId,
    payload,
  }: WebhookIngestionContext): Promise<WebhookIngestionResult[]> {
    const result = await this.alertProcessor.processGrafanaEvent({
      workspaceId,
      payload,
    });

    return [result];
  }
}

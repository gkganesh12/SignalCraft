import { Injectable } from '@nestjs/common';
import { AlertProcessorService } from '../../alerts/alert-processor.service';
import { AlertSeverity, NormalizedAlert } from '@signalcraft/shared';
import {
  WebhookIngestionContext,
  WebhookIngestionResult,
  WebhookIngestionStrategy,
} from './webhook-ingestion.strategy';

@Injectable()
export class GenericWebhookStrategy implements WebhookIngestionStrategy {
  readonly source = 'generic';

  constructor(private readonly alertProcessor: AlertProcessorService) {}

  canHandle(source: string): boolean {
    return source === this.source || source === 'GENERIC_WEBHOOK';
  }

  async ingest({
    workspaceId,
    payload,
  }: WebhookIngestionContext): Promise<WebhookIngestionResult[]> {
    const normalized = this.normalizeGenericPayload(payload);
    const result = await this.alertProcessor.processNormalizedAlert({
      workspaceId,
      normalized,
      payload,
    });
    return [result];
  }

  private normalizeGenericPayload(payload: Record<string, unknown>): NormalizedAlert {
    const eventId = this.getString(payload.eventId) ?? `generic:${Date.now()}`;
    const project = this.getString(payload.project) ?? 'generic';
    const environment = this.getString(payload.environment) ?? 'production';
    const severity = this.mapSeverity(this.getString(payload.severity));
    const title = this.getString(payload.title) ?? 'Generic Alert';
    const description = this.getString(payload.message) ?? '';
    const occurredAt = this.parseTimestamp(this.getString(payload.occurredAt));

    const tags = this.normalizeTags(payload.tags);
    const fingerprint = this.getString(payload.fingerprint) ?? `${project}:${title}`;

    return {
      source: 'GENERIC_WEBHOOK',
      sourceEventId: eventId,
      project,
      environment,
      severity,
      fingerprint,
      title,
      description,
      tags,
      occurredAt,
      link: this.getString(payload.url) ?? null,
      userCount: this.getNumber(payload.userCount),
    };
  }

  private mapSeverity(value?: string): AlertSeverity {
    switch ((value ?? '').toUpperCase()) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      case 'INFO':
      default:
        return 'INFO';
    }
  }

  private normalizeTags(tags: unknown): Record<string, string> {
    if (tags && typeof tags === 'object' && !Array.isArray(tags)) {
      return Object.entries(tags as Record<string, unknown>).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          acc[key] = String(value ?? '');
          return acc;
        },
        {},
      );
    }
    return {};
  }

  private getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private getNumber(value: unknown): number | null {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  private parseTimestamp(timestamp?: string): Date {
    if (!timestamp) {
      return new Date();
    }
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }
}

import { Injectable } from '@nestjs/common';
import { NormalizedAlert, AlertSeverity } from '@signalcraft/shared';

@Injectable()
export class NormalizationService {
  normalizeSentry(payload: Record<string, unknown>): NormalizedAlert {
    const payloadRecord = this.asRecord(payload);
    const payloadData = this.asRecord(payloadRecord.data);
    const event = this.asRecord(payloadRecord.event ?? payloadData.event ?? payloadRecord);

    const sourceEventId =
      this.getString(event.event_id) ??
      this.getString(payloadRecord.event_id) ??
      this.getString(payloadRecord.id) ??
      this.getString(payloadData.event_id);
    if (!sourceEventId) {
      throw new Error('Missing Sentry event id');
    }

    const project =
      this.getString(payloadRecord.project_slug) ??
      this.getString(payloadRecord.project) ??
      this.getString(payloadRecord.project_name) ??
      'unknown';
    const environment =
      this.getString(event.environment) ??
      this.getString(payloadRecord.environment) ??
      this.findTag(event, 'environment') ??
      'unknown';

    const severity = this.mapSeverity(
      this.getString(event.level) ?? this.getString(payloadRecord.level),
    );
    const title =
      this.getString(event.title) ?? this.getString(payloadRecord.title) ?? 'Sentry Issue';
    const description =
      this.getString(event.message) ??
      this.getString(payloadRecord.message) ??
      this.getString(event.culprit) ??
      '';

    const tags = this.normalizeTags(event.tags ?? payloadRecord.tags);
    const fingerprint = this.extractFingerprint(event, title, sourceEventId);

    const occurredAt = this.parseTimestamp(
      this.getString(event.timestamp) ?? this.getString(payloadRecord.timestamp),
    );
    const link = this.getString(payloadRecord.url) ?? null;

    return {
      source: 'SENTRY',
      sourceEventId: String(sourceEventId),
      project: String(project),
      environment: String(environment),
      severity,
      fingerprint,
      title: String(title),
      description: String(description),
      tags,
      occurredAt,
      link,
    };
  }

  private mapSeverity(level?: string): AlertSeverity {
    switch ((level ?? '').toLowerCase()) {
      case 'fatal':
        return 'critical';
      case 'error':
        return 'high';
      case 'warning':
        return 'med';
      case 'info':
        return 'low';
      case 'debug':
        return 'info';
      default:
        return 'info';
    }
  }

  private normalizeTags(tagsInput?: unknown): Record<string, string> {
    if (Array.isArray(tagsInput)) {
      return tagsInput.reduce<Record<string, string>>((acc, tag) => {
        if (Array.isArray(tag) && tag.length >= 2) {
          acc[String(tag[0])] = String(tag[1]);
        }
        return acc;
      }, {});
    }

    if (tagsInput && typeof tagsInput === 'object') {
      return Object.entries(tagsInput as Record<string, unknown>).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          acc[key] = String(value ?? '');
          return acc;
        },
        {},
      );
    }

    return {};
  }

  private findTag(event: Record<string, unknown>, key: string): string | null {
    const tags = event.tags;
    if (!Array.isArray(tags)) {
      return null;
    }
    const match = tags.find((tag) => Array.isArray(tag) && tag[0] === key);
    return match && typeof match[1] !== 'undefined' ? String(match[1]) : null;
  }

  private extractFingerprint(
    event: Record<string, unknown>,
    title: string,
    fallback: string,
  ): string {
    const fingerprint = event.fingerprint ?? event.fingerprint_hash;
    if (Array.isArray(fingerprint)) {
      return fingerprint.map((item) => String(item)).join('|');
    }
    if (fingerprint) {
      return String(fingerprint);
    }
    return `${title}:${fallback}`;
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

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}

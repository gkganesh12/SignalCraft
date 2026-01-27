import { Injectable, Logger } from '@nestjs/common';
import { AlertSeverity, WebhookRegistry } from '@signalcraft/database';
import { WebhookStrategy, NormalizedAlert } from '../webhook.strategy';
import * as jp from 'jsonpath';
import * as crypto from 'crypto';

@Injectable()
export class GenericWebhookStrategy implements WebhookStrategy {
    private readonly logger = new Logger(GenericWebhookStrategy.name);

    async parse(payload: any, headers?: Record<string, string>, config?: WebhookRegistry): Promise<NormalizedAlert | null> {
        if (!config || !config.fieldMappings) {
            this.logger.error('Generic webhook invoked without field mappings');
            return null;
        }

        const mappings = config.fieldMappings as any;
        const severityMap = config.severityMap as any;

        try {
            // Extract fields using JSONPath
            const title = this.extractField(payload, mappings.title) || 'Generic Webhook Alert';
            const message = this.extractField(payload, mappings.message) || '';
            const rawSeverity = this.extractField(payload, mappings.severity);
            const sourceEventId = this.extractField(payload, mappings.sourceEventId) || crypto.randomUUID();
            const description = this.extractField(payload, mappings.description) || message;
            const environment = this.extractField(payload, mappings.environment) || 'production';
            const project = this.extractField(payload, mappings.project) || 'default';
            const link = this.extractField(payload, mappings.link);

            // Map severity
            const severity = this.mapSeverity(rawSeverity, severityMap);

            return {
                title,
                message,
                severity,
                sourceEventId: String(sourceEventId),
                description,
                link,
                tags: {
                    environment,
                    project,
                    integration_name: config.name,
                },
            };
        } catch (error: any) {
            this.logger.error(`Failed to parse generic webhook: ${error.message}`);
            return null;
        }
    }

    validate(payload: any, headers?: Record<string, string>, secret?: string): boolean {
        // Validation is handled via the webhook token in the service layer
        return true;
    }

    private extractField(payload: any, path?: string): any {
        if (!path) return null;
        try {
            // jsonpath.query returns an array of matches
            const results = jp.query(payload, path);
            return results.length > 0 ? results[0] : null;
        } catch (e) {
            this.logger.warn(`Invalid JSONPath: ${path}`);
            return null;
        }
    }

    private mapSeverity(value: any, severityMap?: Record<string, string>): AlertSeverity {
        if (!value) return AlertSeverity.HIGH;

        const normalizedValue = String(value).toLowerCase();

        // Check custom map first
        if (severityMap && severityMap[normalizedValue]) {
            const mapped = severityMap[normalizedValue].toUpperCase();
            if (Object.values(AlertSeverity).includes(mapped as AlertSeverity)) {
                return mapped as AlertSeverity;
            }
        }

        // Default heuristics
        if (normalizedValue.includes('crit') || normalizedValue.includes('fatal') || normalizedValue.includes('emergency')) return AlertSeverity.CRITICAL;
        if (normalizedValue.includes('err') || normalizedValue.includes('high')) return AlertSeverity.HIGH;
        if (normalizedValue.includes('warn')) return AlertSeverity.MEDIUM;
        if (normalizedValue.includes('info') || normalizedValue.includes('low')) return AlertSeverity.LOW;

        return AlertSeverity.HIGH;
    }
}

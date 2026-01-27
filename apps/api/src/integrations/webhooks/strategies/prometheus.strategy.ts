import { Injectable } from '@nestjs/common';
import { AlertSeverity } from '@signalcraft/database';
import { WebhookStrategy, NormalizedAlert } from '../webhook.strategy';

@Injectable()
export class PrometheusStrategy implements WebhookStrategy {
    async parse(payload: any): Promise<NormalizedAlert | null> {
        // Alertmanager Webhook Format
        // Payload contains a list of alerts: { alerts: [...] }
        // We usually process the first one or split them. 
        // For SignalCraft's single-event model, let's take the CommonLabels and CommonAnnotations 
        // representing the group, or pick the first firing alert.

        const alerts = payload.alerts || [];
        if (alerts.length === 0) return null;

        const firstAlert = alerts[0];
        const status = payload.status || firstAlert.status; // "firing" or "resolved"

        const name = payload.commonLabels?.alertname || firstAlert.labels?.alertname || 'Prometheus Alert';
        const summary = payload.commonAnnotations?.summary || firstAlert.annotations?.summary || '';
        const description = payload.commonAnnotations?.description || firstAlert.annotations?.description || '';

        // Severity Mapping
        let severity: AlertSeverity = AlertSeverity.HIGH;
        const severityLabel = (payload.commonLabels?.severity || firstAlert.labels?.severity || '').toLowerCase();

        if (status === 'resolved') severity = AlertSeverity.INFO;
        else if (severityLabel === 'critical') severity = AlertSeverity.CRITICAL;
        else if (severityLabel === 'warning') severity = AlertSeverity.MEDIUM;
        else if (severityLabel === 'info') severity = AlertSeverity.LOW;

        // Unique ID: Prometheus doesn't give a unique event ID across time, usually fingerprint.
        // We handle this by combining groupKey or generated fingerprint.
        const fingerprint = payload.groupKey || `${name}-${Date.now()}`;

        return {
            title: name,
            message: `${summary} - ${description}`,
            severity,
            sourceEventId: fingerprint,
            description,
            tags: { ...payload.commonLabels, ...firstAlert.labels },
            link: payload.externalURL, // Link to Alertmanager
        };
    }

    validate(payload: any): boolean {
        return true;
    }
}

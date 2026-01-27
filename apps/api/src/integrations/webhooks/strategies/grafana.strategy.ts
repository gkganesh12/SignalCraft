import { Injectable, Logger } from '@nestjs/common';
import { AlertSeverity } from '@signalcraft/database';
import { WebhookStrategy, NormalizedAlert } from '../webhook.strategy';

@Injectable()
export class GrafanaWebhookStrategy implements WebhookStrategy {
    private readonly logger = new Logger(GrafanaWebhookStrategy.name);

    async parse(payload: any): Promise<NormalizedAlert | null> {
        // Grafana 8+ Alerts (Unified Alerting)
        if (payload.alerts && Array.isArray(payload.alerts)) {
            return this.parseUnifiedAlert(payload);
        }

        // Legacy Grafana Alerts
        return this.parseLegacyAlert(payload);
    }

    private parseUnifiedAlert(payload: any): NormalizedAlert | null {
        const alerts = payload.alerts;
        if (alerts.length === 0) return null;

        const first = alerts[0];
        const status = payload.status; // "firing" or "resolved"

        let severity: AlertSeverity = AlertSeverity.HIGH;
        if (status === 'resolved') severity = AlertSeverity.INFO;
        else if (first.labels?.severity === 'critical') severity = AlertSeverity.CRITICAL;

        return {
            title: payload.title || first.annotations?.summary || 'Grafana Alert',
            message: first.annotations?.description || first.annotations?.summary || '',
            severity,
            sourceEventId: payload.groupKey || first.fingerprint || `${Date.now()}`,
            description: first.annotations?.description,
            tags: {
                ...payload.commonLabels,
                ...first.labels,
                source: 'grafana_unified',
            },
            link: payload.externalURL,
        };
    }

    private parseLegacyAlert(payload: any): NormalizedAlert | null {
        const state = payload.state;
        if (!state) return null;

        let severity: AlertSeverity = AlertSeverity.HIGH;
        if (state === 'ok') severity = AlertSeverity.INFO;
        else if (state === 'no_data') severity = AlertSeverity.MEDIUM;
        else if (state === 'alerting') severity = AlertSeverity.CRITICAL;

        return {
            title: payload.title || payload.ruleName || 'Grafana Alert',
            message: payload.message || `State: ${state}`,
            severity,
            sourceEventId: String(payload.ruleId) || `${Date.now()}`,
            description: payload.message,
            tags: {
                ruleId: String(payload.ruleId),
                orgId: String(payload.orgId),
                source: 'grafana_legacy',
            },
            link: payload.ruleUrl,
        };
    }

    validate(payload: any): boolean {
        return true;
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { AlertSeverity } from '@signalcraft/database';
import { WebhookStrategy, NormalizedAlert } from '../webhook.strategy';

@Injectable()
export class GcpMonitoringStrategy implements WebhookStrategy {
    private readonly logger = new Logger(GcpMonitoringStrategy.name);

    async parse(payload: any): Promise<NormalizedAlert | null> {
        const incident = payload.incident;
        if (!incident) {
            this.logger.warn('Received invalid GCP Monitoring payload (missing incident)');
            return null;
        }

        // Severity mapping: GCP doesn't have a rigid severity in the webhook, but we can look for it in labels or use default
        let severity: AlertSeverity = AlertSeverity.HIGH;
        if (incident.state === 'closed') {
            severity = AlertSeverity.INFO;
        }

        return {
            title: incident.policy_name || 'GCP Monitoring Alert',
            message: incident.summary || `GCP Incident in project ${incident.project_id}`,
            severity,
            sourceEventId: incident.incident_id || `${Date.now()}`,
            description: incident.summary,
            tags: {
                projectId: incident.project_id,
                resourceId: incident.resource_id,
                resourceName: incident.resource_name,
                resourceType: incident.resource_display_name,
                policyName: incident.policy_name,
                state: incident.state,
                source: 'gcp_monitoring',
            },
            link: incident.url,
        };
    }

    validate(payload: any): boolean {
        return true;
    }
}

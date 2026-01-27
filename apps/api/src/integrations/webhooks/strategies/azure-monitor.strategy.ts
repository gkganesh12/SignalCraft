import { Injectable, Logger } from '@nestjs/common';
import { AlertSeverity } from '@signalcraft/database';
import { WebhookStrategy, NormalizedAlert } from '../webhook.strategy';

@Injectable()
export class AzureMonitorStrategy implements WebhookStrategy {
    private readonly logger = new Logger(AzureMonitorStrategy.name);

    async parse(payload: any): Promise<NormalizedAlert | null> {
        const data = payload.data;
        if (!data || !data.essentials) {
            this.logger.warn('Received invalid Azure Monitor payload (missing essentials)');
            return null;
        }

        const essentials = data.essentials;

        // Severity mapping: Azure uses Sev0 (Critical) to Sev4 (Verbose)
        let severity: AlertSeverity = AlertSeverity.HIGH;
        switch (essentials.severity) {
            case 'Sev0': severity = AlertSeverity.CRITICAL; break;
            case 'Sev1': severity = AlertSeverity.HIGH; break;
            case 'Sev2': severity = AlertSeverity.MEDIUM; break;
            case 'Sev3':
            case 'Sev4': severity = AlertSeverity.LOW; break;
        }

        // Handle resolved state
        if (essentials.monitorCondition === 'Resolved') {
            severity = AlertSeverity.INFO;
        }

        return {
            title: essentials.alertRule || 'Azure Monitor Alert',
            message: essentials.description || `Azure Alert on ${essentials.targetResourceName}`,
            severity,
            sourceEventId: essentials.alertId || `${Date.now()}`,
            description: essentials.description,
            tags: {
                resourceId: essentials.targetResourceId,
                resourceName: essentials.targetResourceName,
                resourceType: essentials.targetResourceType,
                resourceGroup: essentials.targetResourceGroup,
                subscriptionId: essentials.subscriptionId,
                monitorService: essentials.monitorService,
                signalType: essentials.signalType,
                source: 'azure_monitor',
            },
            link: `https://portal.azure.com/#ignore/resource${essentials.targetResourceId}/alerts`,
        };
    }

    validate(payload: any): boolean {
        return true;
    }
}

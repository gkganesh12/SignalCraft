import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import axios from 'axios';

interface OpsgenieConfig {
    apiKey: string;
    region?: 'us' | 'eu';
}

interface CreateAlertDto {
    message: string;
    description: string;
    priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
    alertId: string;
    source?: string;
}

@Injectable()
export class OpsgenieService {
    private readonly logger = new Logger(OpsgenieService.name);

    private getApiUrl(region: string = 'us'): string {
        return region === 'eu'
            ? 'https://api.eu.opsgenie.com/v2'
            : 'https://api.opsgenie.com/v2';
    }

    /**
     * Create an alert in Opsgenie
     */
    async createAlert(
        workspaceId: string,
        dto: CreateAlertDto,
    ): Promise<{ success: boolean; alertId?: string; error?: string }> {
        try {
            const integration = await prisma.integration.findFirst({
                where: {
                    workspaceId,
                    type: 'OPSGENIE' as any,
                    status: 'ACTIVE',
                },
            });

            if (!integration || !integration.configJson) {
                return { success: false, error: 'Opsgenie not configured' };
            }

            const config = integration.configJson as any;
            const apiUrl = this.getApiUrl(config.region);

            const response = await axios.post(
                `${apiUrl}/alerts`,
                {
                    message: dto.message,
                    description: dto.description,
                    priority: dto.priority,
                    source: dto.source || 'SignalCraft',
                    alias: `signalcraft-${dto.alertId}`,
                    tags: ['signalcraft'],
                },
                {
                    headers: {
                        Authorization: `GenieKey ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const opsgenieAlertId = response.data.requestId;
            this.logger.log(`Opsgenie alert created: ${opsgenieAlertId}`);

            return { success: true, alertId: opsgenieAlertId };
        } catch (error: any) {
            this.logger.error('Failed to create Opsgenie alert:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test Opsgenie connection
     */
    async testConnection(apiKey: string, region: string = 'us'): Promise<{ success: boolean; error?: string }> {
        try {
            const apiUrl = this.getApiUrl(region);
            await axios.get(`${apiUrl}/users`, {
                headers: {
                    Authorization: `GenieKey ${apiKey}`,
                },
                params: { limit: 1 },
            });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }

    /**
     * Map SignalCraft severity to Opsgenie priority
     */
    mapToPriority(severity: string): 'P1' | 'P2' | 'P3' | 'P4' | 'P5' {
        switch (severity.toUpperCase()) {
            case 'CRITICAL': return 'P1';
            case 'HIGH': return 'P2';
            case 'MEDIUM': return 'P3';
            case 'LOW': return 'P4';
            default: return 'P5';
        }
    }
}

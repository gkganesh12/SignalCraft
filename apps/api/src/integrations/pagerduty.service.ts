import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import axios from 'axios';

interface PagerDutyConfig {
    apiKey: string;
    serviceId: string; // Default service for incidents
}

interface CreateIncidentDto {
    title: string;
    description: string;
    urgency: 'high' | 'low';
    alertId: string;
    severity: string;
}

@Injectable()
export class PagerDutyService {
    private readonly logger = new Logger(PagerDutyService.name);
    private readonly apiUrl = 'https://api.pagerduty.com';

    /**
     * Create an incident in PagerDuty
     */
    async createIncident(
        workspaceId: string,
        dto: CreateIncidentDto,
    ): Promise<{ success: boolean; incidentId?: string; error?: string }> {
        try {
            // Get PagerDuty config for workspace (from Integration table)
            const integration = await prisma.integration.findFirst({
                where: {
                    workspaceId,
                    type: 'PAGERDUTY', // We'll need to add this enum value
                    status: 'ACTIVE',
                },
            });

            if (!integration || !integration.config) {
                return { success: false, error: 'PagerDuty not configured' };
            }

            const config = integration.config as any;
            const apiKey = config.apiKey;
            const serviceId = config.serviceId;

            // Map severity to urgency
            const urgency = ['CRITICAL', 'HIGH'].includes(dto.severity) ? 'high' : 'low';

            // Create incident via PagerDuty Events API v2
            const response = await axios.post(
                `${this.apiUrl}/incidents`,
                {
                    incident: {
                        type: 'incident',
                        title: dto.title,
                        service: {
                            id: serviceId,
                            type: 'service_reference',
                        },
                        urgency,
                        body: {
                            type: 'incident_body',
                            details: dto.description,
                        },
                    },
                },
                {
                    headers: {
                        Authorization: `Token token=${apiKey}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/vnd.pagerduty+json;version=2',
                    },
                },
            );

            const incidentId = response.data.incident.id;
            this.logger.log(`PagerDuty incident created: ${incidentId} for alert ${dto.alertId}`);

            return { success: true, incidentId };
        } catch (error: any) {
            this.logger.error('Failed to create PagerDuty incident:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test PagerDuty connection
     */
    async testConnection(apiKey: string, serviceId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Verify API key by fetching service details
            const response = await axios.get(`${this.apiUrl}/services/${serviceId}`, {
                headers: {
                    Authorization: `Token token=${apiKey}`,
                    Accept: 'application/vnd.pagerduty+json;version=2',
                },
            });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    /**
     * Get all services for a PagerDuty account
     */
    async getServices(apiKey: string): Promise<any[]> {
        try {
            const response = await axios.get(`${this.apiUrl}/services`, {
                headers: {
                    Authorization: `Token token=${apiKey}`,
                    Accept: 'application/vnd.pagerduty+json;version=2',
                },
                params: {
                    limit: 100,
                },
            });

            return response.data.services;
        } catch (error) {
            this.logger.error('Failed to fetch PagerDuty services:', error);
            return [];
        }
    }
}

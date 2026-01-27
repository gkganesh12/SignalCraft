import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, WebhookRegistry, IntegrationType } from '@signalcraft/database';
import * as crypto from 'crypto';

@Injectable()
export class WebhookRegistryService {
    /**
     * List all webhook registrations for a workspace
     */
    async listByWorkspace(workspaceId: string): Promise<WebhookRegistry[]> {
        return prisma.webhookRegistry.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create a new webhook registration
     */
    async create(workspaceId: string, data: {
        name: string;
        type: IntegrationType;
        fieldMappings?: any;
        severityMap?: any
    }): Promise<WebhookRegistry> {
        const token = crypto.randomBytes(24).toString('hex');
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:5050';

        // Each webhook gets a unique URL with a secret token
        const webhookUrl = `${baseUrl}/webhooks/${data.type.toLowerCase()}?token=${token}`;

        return prisma.webhookRegistry.create({
            data: {
                workspaceId,
                name: data.name,
                integrationType: data.type,
                webhookUrl,
                webhookToken: token,
                fieldMappings: data.fieldMappings || {},
                severityMap: data.severityMap || {},
            },
        });
    }

    /**
     * Update an existing webhook registration
     */
    async update(workspaceId: string, id: string, data: Partial<WebhookRegistry>): Promise<WebhookRegistry> {
        const webhook = await prisma.webhookRegistry.findFirst({
            where: { id, workspaceId },
        });

        if (!webhook) {
            throw new NotFoundException('Webhook registration not found');
        }

        return prisma.webhookRegistry.update({
            where: { id },
            data: {
                name: data.name,
                enabled: data.enabled,
                fieldMappings: data.fieldMappings as any,
                severityMap: data.severityMap as any,
            },
        });
    }

    /**
     * Delete a webhook registration
     */
    async delete(workspaceId: string, id: string): Promise<void> {
        const webhook = await prisma.webhookRegistry.findFirst({
            where: { id, workspaceId },
        });

        if (!webhook) {
            throw new NotFoundException('Webhook registration not found');
        }

        await prisma.webhookRegistry.delete({ where: { id } });
    }

    /**
     * Find a webhook registration by its secret token
     */
    async findByToken(token: string): Promise<WebhookRegistry | null> {
        return prisma.webhookRegistry.findUnique({
            where: { webhookToken: token },
        });
    }
}

import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

export interface NotificationPreferences {
    defaultChannel: string;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    escalationEnabled: boolean;
    escalationMinutes: number;
}

@Injectable()
export class SettingsService {
    // In-memory mock for notification preferences since we don't have a model yet
    private mockPreferences: NotificationPreferences = {
        defaultChannel: '#alerts',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        escalationEnabled: true,
        escalationMinutes: 15,
    };

    async getWorkspaceSettings(workspaceId: string) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
        });
    }

    async updateWorkspaceSettings(workspaceId: string, data: { name: string }) {
        return prisma.workspace.update({
            where: { id: workspaceId },
            data: { name: data.name },
        });
    }

    async getUsers(workspaceId: string) {
        return prisma.user.findMany({
            where: { workspaceId },
            select: {
                id: true,
                email: true,
                displayName: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async inviteUser(workspaceId: string, email: string) {
        // Mock invitation - just return success
        // In production, this would create an invitation record and send an email
        return { success: true, message: `Invitation sent to ${email}` };
    }

    getNotificationPreferences(workspaceId: string) {
        return this.mockPreferences;
    }

    updateNotificationPreferences(workspaceId: string, preferences: NotificationPreferences) {
        this.mockPreferences = { ...this.mockPreferences, ...preferences };
        return this.mockPreferences;
    }
}

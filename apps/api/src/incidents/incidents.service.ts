import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, IncidentRole, IncidentTimelineEventType, Prisma } from '@signalcraft/database';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../common/websocket/events.gateway';

@Injectable()
export class IncidentsService {
    constructor(
        private readonly alertsService: AlertsService,
        private readonly eventsGateway: EventsGateway,
    ) { }

    async listRoles(workspaceId: string, alertGroupId: string) {
        return prisma.incidentRoleAssignment.findMany({
            where: {
                alertGroupId,
                alertGroup: { workspaceId }
            },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true }
                }
            },
        });
    }

    async assignRole(workspaceId: string, alertGroupId: string, role: string, userId: string) {
        const incidentRole = this.parseRole(role);

        const alertGroup = await prisma.alertGroup.findUnique({
            where: { id: alertGroupId, workspaceId },
        });

        if (!alertGroup) {
            throw new NotFoundException('Incident not found');
        }

        const assignment = await prisma.incidentRoleAssignment.upsert({
            where: {
                alertGroupId_role: { alertGroupId, role: incidentRole }
            },
            create: {
                alertGroupId,
                userId,
                role: incidentRole,
            },
            update: { userId },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true }
                }
            },
        });

        await this.alertsService.createTimelineEntry(alertGroupId, {
            type: IncidentTimelineEventType.ROLE_ASSIGNED,
            title: 'Incident role assigned',
            message: `${incidentRole} assigned to ${assignment.user.displayName || assignment.user.email}`,
            source: 'system',
            metadata: { role: incidentRole, userId },
        });

        this.eventsGateway.emitToWorkspace(workspaceId, 'incident.role_updated', assignment);

        return assignment;
    }

    async removeRole(workspaceId: string, alertGroupId: string, role: string) {
        const incidentRole = this.parseRole(role);

        const existing = await prisma.incidentRoleAssignment.findUnique({
            where: {
                alertGroupId_role: { alertGroupId, role: incidentRole },
                alertGroup: { workspaceId }
            },
        });

        if (!existing) {
            throw new NotFoundException('Role assignment not found');
        }

        await prisma.incidentRoleAssignment.delete({
            where: { id: existing.id },
        });

        await this.alertsService.createTimelineEntry(alertGroupId, {
            type: IncidentTimelineEventType.ROLE_ASSIGNED,
            title: 'Incident role removed',
            message: `${incidentRole} role unassigned`,
            source: 'system',
            metadata: { role: incidentRole },
        });

        this.eventsGateway.emitToWorkspace(workspaceId, 'incident.role_removed', { alertGroupId, role: incidentRole });

        return { success: true };
    }

    private parseRole(role: string): IncidentRole {
        const normalized = role.toUpperCase();
        if (normalized in IncidentRole) {
            return IncidentRole[normalized as keyof typeof IncidentRole];
        }
        throw new Error(`Invalid incident role: ${role}`);
    }
}

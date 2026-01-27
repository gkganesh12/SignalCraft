import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, IncidentTimelineEventType } from '@signalcraft/database';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../common/websocket/events.gateway';

@Injectable()
export class CollaborationService {
    constructor(
        private readonly alertsService: AlertsService,
        private readonly eventsGateway: EventsGateway,
    ) { }

    async listComments(workspaceId: string, alertGroupId: string) {
        return prisma.comment.findMany({
            where: {
                alertGroupId,
                alertGroup: { workspaceId }
            },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true }
                },
                replies: {
                    include: {
                        user: {
                            select: { id: true, email: true, displayName: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async addComment(workspaceId: string, alertGroupId: string, userId: string, content: string, parentId?: string) {
        const comment = await prisma.comment.create({
            data: {
                alertGroupId,
                userId,
                content,
                parentId,
            },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true }
                }
            }
        });

        // Add to timeline
        await this.alertsService.createTimelineEntry(alertGroupId, {
            type: IncidentTimelineEventType.COMMENT_ADDED,
            title: 'Comment added',
            message: `${comment.user.displayName || comment.user.email} commented: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            source: 'user',
            metadata: { commentId: comment.id, userId },
        });

        this.eventsGateway.emitToWorkspace(workspaceId, 'incident.comment_added', comment);

        return comment;
    }

    async deleteComment(workspaceId: string, commentId: string, userId: string) {
        const comment = await prisma.comment.findFirst({
            where: {
                id: commentId,
                userId, // Only owner can delete for now
                alertGroup: { workspaceId }
            }
        });

        if (!comment) {
            throw new NotFoundException('Comment not found or unauthorized');
        }

        await prisma.comment.delete({
            where: { id: commentId }
        });

        this.eventsGateway.emitToWorkspace(workspaceId, 'incident.comment_deleted', { id: commentId, alertGroupId: comment.alertGroupId });

        return { success: true };
    }
}

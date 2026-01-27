import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, PostMortemStatus, IncidentTimelineEventType } from '@signalcraft/database';
import { AiService } from '../ai/ai.service';
import { CorrelationService } from '../alerts/correlation.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class PostmortemService {
    constructor(
        private readonly aiService: AiService,
        private readonly correlationService: CorrelationService,
        private readonly alertsService: AlertsService,
    ) { }

    async getPostmortem(workspaceId: string, alertGroupId: string) {
        return prisma.postMortem.findUnique({
            where: { alertGroupId },
            include: { actionItems: true },
        });
    }

    async createOrUpdatePostmortem(workspaceId: string, alertGroupId: string, data: any) {
        return prisma.postMortem.upsert({
            where: { alertGroupId },
            create: {
                alertGroupId,
                workspaceId,
                title: data.title || 'Untitled Post-Mortem',
                summary: data.summary,
                impact: data.impact,
                rootCause: data.rootCause,
                status: data.status || PostMortemStatus.DRAFT,
            },
            update: {
                title: data.title,
                summary: data.summary,
                impact: data.impact,
                rootCause: data.rootCause,
                status: data.status,
                publishedAt: data.status === PostMortemStatus.PUBLISHED ? new Date() : undefined,
            },
        });
    }

    async generateDraft(workspaceId: string, alertGroupId: string) {
        const group = await prisma.alertGroup.findUnique({
            where: { id: alertGroupId, workspaceId },
            include: {
                alertEvents: { orderBy: { occurredAt: 'asc' }, take: 15 },
            },
        });

        if (!group) throw new NotFoundException('Incident not found');

        const correlatedAlerts = await this.correlationService.getCorrelatedAlerts(workspaceId, alertGroupId);
        const timelineEntries = await this.alertsService.listTimelineEntries(workspaceId, alertGroupId);

        const context = {
            title: group.title,
            severity: group.severity,
            durationMins: group.resolvedAt ? Math.round((group.resolvedAt.getTime() - group.createdAt.getTime()) / 60000) : 0,
            impact: group.userCount ? `${group.userCount} users affected` : 'Unknown visibility',
            resolution: group.resolutionNotes || 'No resolution notes found.',
            timeline: timelineEntries.map(e => `${e.occurredAt.toISOString()}: ${e.title}`).join('\n'),
            correlated: correlatedAlerts.map(a => a.title).join(', '),
        };

        if (!this.aiService.isEnabled()) {
            return {
                title: `Post-Mortem: ${group.title}`,
                summary: 'AI Service not enabled for automatic drafting.',
                impact: context.impact,
                rootCause: 'Manual investigation required.'
            };
        }

        const prompt = `
      As an expert SRE, generate an incident post-mortem draft.
      
      INCIDENT CONTEXT:
      - Title: ${context.title}
      - Severity: ${context.severity}
      - Duration: ${context.durationMins} minutes
      - Impact: ${context.impact}
      - Resolution: ${context.resolution}
      
      TIMELINE:
      ${context.timeline}
      
      CORRELATED INCIDENTS:
      ${context.correlated}
      
      OUTPUT JSON format:
      {
        "title": "Post-Mortem: ${context.title}",
        "summary": "Full executive summary...",
        "impact": "Detailed impact analysis...",
        "rootCause": "Deep dive into root cause..."
      }
    `;

        const draftStr = await this.aiService.generateContent(prompt);
        try {
            // Basic JSON extraction if AI wraps in markdown blocks
            const jsonStr = draftStr.includes('```json')
                ? draftStr.split('```json')[1].split('```')[0].trim()
                : draftStr;
            return JSON.parse(jsonStr);
        } catch (e) {
            // Fallback if parsing fails
            return {
                title: `Post-Mortem: ${group.title}`,
                summary: draftStr,
                impact: context.impact,
                rootCause: 'See summary.'
            };
        }
    }

    async addActionItem(workspaceId: string, alertGroupId: string, data: any) {
        const postMortem = await prisma.postMortem.findUnique({ where: { alertGroupId } });
        if (!postMortem) throw new NotFoundException('Post-Mortem not found. Create draft first.');

        const actionItem = await prisma.actionItem.create({
            data: {
                postMortemId: postMortem.id,
                title: data.title,
                description: data.description,
                priority: data.priority || 'MEDIUM',
                status: 'TODO',
                assigneeId: data.assigneeId,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
            },
        });

        await this.alertsService.createTimelineEntry(alertGroupId, {
            type: IncidentTimelineEventType.ACTION_ITEM_CREATED,
            title: 'Action item created',
            message: actionItem.title,
            source: 'system',
            metadata: { actionItemId: actionItem.id },
        });

        return actionItem;
    }
}

import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

interface CreateAuditLogDto {
    workspaceId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    /**
     * Create an audit log entry
     */
    async log(dto: CreateAuditLogDto): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    workspaceId: dto.workspaceId,
                    userId: dto.userId,
                    action: dto.action,
                    resourceType: dto.resourceType,
                    resourceId: dto.resourceId,
                    metadata: dto.metadata || {},
                    ipAddress: dto.ipAddress,
                    userAgent: dto.userAgent,
                },
            });
        } catch (error) {
            // Don't fail the request if audit logging fails
            console.error('Failed to create audit log:', error);
        }
    }

    /**
     * Get audit logs for a workspace with filters
     */
    async getAuditLogs(
        workspaceId: string,
        filters: {
            userId?: string;
            action?: string;
            resourceType?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        } = {},
    ) {
        const where: any = { workspaceId };

        if (filters.userId) where.userId = filters.userId;
        if (filters.action) where.action = filters.action;
        if (filters.resourceType) where.resourceType = filters.resourceType;
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            email: true,
                            displayName: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: filters.limit || 50,
                skip: filters.offset || 0,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { logs, total };
    }

    /**
     * Export audit logs as CSV
     */
    async exportLogs(workspaceId: string, filters: any = {}): Promise<string> {
        const { logs } = await this.getAuditLogs(workspaceId, { ...filters, limit: 10000 });

        const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
        const rows = logs.map((log) => [
            log.createdAt.toISOString(),
            (log.user as any).email,
            log.action,
            log.resourceType,
            log.resourceId || '',
            log.ipAddress || '',
        ]);

        return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }
}

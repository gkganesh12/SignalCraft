/**
 * Alert Hygiene Service
 * 
 * Provides alert hygiene functionality including:
 * - Snooze/Unsnooze alerts
 * - Auto-close stale alerts
 * - Manual resolution
 * 
 * @module alerts/hygiene.service
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, AlertStatus } from '@signalcraft/database';
import { EscalationService } from '../../escalations/escalation.service';

export interface SnoozeOptions {
    durationHours: number;
    snoozedBy?: string;
}

export interface AutoCloseOptions {
    inactivityDays: number;
    workspaceId: string;
    dryRun?: boolean;
}

@Injectable()
export class HygieneService {
    private readonly logger = new Logger(HygieneService.name);
    private readonly defaultSnoozeDurationHours = 1;
    private readonly defaultAutoCloseDays = 7;

    constructor(private readonly escalationService: EscalationService) { }

    /**
     * Snooze an alert group
     * Suppresses notifications for the specified duration
     */
    async snoozeAlertGroup(
        workspaceId: string,
        alertGroupId: string,
        options: SnoozeOptions,
    ) {
        const group = await prisma.alertGroup.findFirst({
            where: { id: alertGroupId, workspaceId },
        });

        if (!group) {
            throw new NotFoundException(`Alert group not found: ${alertGroupId}`);
        }

        if (group.status === AlertStatus.RESOLVED) {
            throw new BadRequestException('Cannot snooze a resolved alert');
        }

        const durationHours = options.durationHours || this.defaultSnoozeDurationHours;
        const snoozeUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

        const updated = await prisma.alertGroup.update({
            where: { id: alertGroupId },
            data: {
                status: AlertStatus.SNOOZED,
                snoozeUntil,
                assigneeUserId: options.snoozedBy || group.assigneeUserId,
            },
        });

        // Cancel any pending escalations
        await this.escalationService.cancelEscalation(alertGroupId);

        this.logger.log(`Alert group snoozed`, {
            alertGroupId,
            durationHours,
            snoozeUntil,
            snoozedBy: options.snoozedBy,
        });

        return {
            id: updated.id,
            status: updated.status,
            snoozeUntil: updated.snoozeUntil,
        };
    }

    /**
     * Unsnooze an alert group
     * Returns alert to OPEN status
     */
    async unsnoozeAlertGroup(workspaceId: string, alertGroupId: string) {
        const group = await prisma.alertGroup.findFirst({
            where: { id: alertGroupId, workspaceId },
        });

        if (!group) {
            throw new NotFoundException(`Alert group not found: ${alertGroupId}`);
        }

        if (group.status !== AlertStatus.SNOOZED) {
            throw new BadRequestException('Alert is not snoozed');
        }

        const updated = await prisma.alertGroup.update({
            where: { id: alertGroupId },
            data: {
                status: AlertStatus.OPEN,
                snoozeUntil: null,
            },
        });

        this.logger.log(`Alert group unsnoozed`, { alertGroupId });

        return {
            id: updated.id,
            status: updated.status,
        };
    }

    /**
     * Check if a snooze has expired
     */
    isSnoozeExpired(snoozeUntil: Date | null): boolean {
        if (!snoozeUntil) return true;
        return new Date() >= snoozeUntil;
    }

    /**
     * Get all alert groups with expired snoozes
     */
    async getExpiredSnoozes(workspaceId: string) {
        return prisma.alertGroup.findMany({
            where: {
                workspaceId,
                status: AlertStatus.SNOOZED,
                snoozeUntil: { lt: new Date() },
            },
        });
    }

    /**
     * Process expired snoozes - unsnooze them automatically
     */
    async processExpiredSnoozes(workspaceId: string): Promise<number> {
        const expiredGroups = await this.getExpiredSnoozes(workspaceId);

        for (const group of expiredGroups) {
            await prisma.alertGroup.update({
                where: { id: group.id },
                data: {
                    status: AlertStatus.OPEN,
                    snoozeUntil: null,
                },
            });

            this.logger.log(`Snooze expired - alert reopened`, { alertGroupId: group.id });
        }

        return expiredGroups.length;
    }

    /**
     * Manually resolve an alert group with optional resolution notes
     */
    async resolveAlertGroup(
        workspaceId: string,
        alertGroupId: string,
        resolvedBy?: string,
        resolutionNotes?: string,
    ) {
        const group = await prisma.alertGroup.findFirst({
            where: { id: alertGroupId, workspaceId },
        });

        if (!group) {
            throw new NotFoundException(`Alert group not found: ${alertGroupId}`);
        }

        if (group.status === AlertStatus.RESOLVED) {
            return {
                id: group.id,
                status: group.status,
                resolvedAt: group.resolvedAt,
                message: 'Alert is already resolved',
            };
        }

        // Calculate resolution time in minutes
        const resolvedAt = new Date();
        const resolutionMinutes = Math.round(
            (resolvedAt.getTime() - group.lastSeenAt.getTime()) / (1000 * 60)
        );

        // Calculate rolling average resolution time
        const newAvgResolution = group.avgResolutionMins
            ? Math.round((group.avgResolutionMins + resolutionMinutes) / 2)
            : resolutionMinutes;

        const updated = await prisma.alertGroup.update({
            where: { id: alertGroupId },
            data: {
                status: AlertStatus.RESOLVED,
                resolvedAt,
                snoozeUntil: null,
                assigneeUserId: resolvedBy || group.assigneeUserId,
                // Resolution Memory fields
                resolutionNotes: resolutionNotes || group.resolutionNotes,
                lastResolvedBy: resolvedBy || group.lastResolvedBy,
                avgResolutionMins: newAvgResolution,
            },
        });

        // Cancel any pending escalations
        await this.escalationService.cancelEscalation(alertGroupId);

        this.logger.log(`Alert group resolved`, {
            alertGroupId,
            resolvedBy,
            resolutionMinutes,
            hasNotes: !!resolutionNotes,
        });

        return {
            id: updated.id,
            status: updated.status,
            resolvedAt: updated.resolvedAt,
            resolutionNotes: updated.resolutionNotes,
            avgResolutionMins: updated.avgResolutionMins,
        };
    }

    /**
     * Acknowledge an alert group
     */
    async acknowledgeAlertGroup(
        workspaceId: string,
        alertGroupId: string,
        acknowledgedBy?: string,
    ) {
        const group = await prisma.alertGroup.findFirst({
            where: { id: alertGroupId, workspaceId },
        });

        if (!group) {
            throw new NotFoundException(`Alert group not found: ${alertGroupId}`);
        }

        if (group.status === AlertStatus.RESOLVED) {
            throw new BadRequestException('Cannot acknowledge a resolved alert');
        }

        const updated = await prisma.alertGroup.update({
            where: { id: alertGroupId },
            data: {
                status: AlertStatus.ACK,
                snoozeUntil: null,
                assigneeUserId: acknowledgedBy || group.assigneeUserId,
            },
        });

        // Cancel any pending escalations
        await this.escalationService.cancelEscalation(alertGroupId);

        this.logger.log(`Alert group acknowledged`, {
            alertGroupId,
            acknowledgedBy,
        });

        return {
            id: updated.id,
            status: updated.status,
        };
    }

    /**
     * Auto-close stale alerts
     * Closes alerts that have been inactive for longer than the threshold
     */
    async autoCloseStaleAlerts(options: AutoCloseOptions): Promise<{
        closedCount: number;
        closedIds: string[];
    }> {
        const { inactivityDays, workspaceId, dryRun = false } = options;
        const thresholdDate = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);

        // Find stale alerts
        const staleAlerts = await prisma.alertGroup.findMany({
            where: {
                workspaceId,
                status: { in: [AlertStatus.OPEN, AlertStatus.ACK] },
                lastSeenAt: { lt: thresholdDate },
            },
            select: { id: true, title: true, lastSeenAt: true },
        });

        if (dryRun) {
            return {
                closedCount: staleAlerts.length,
                closedIds: staleAlerts.map((a) => a.id),
            };
        }

        // Close stale alerts
        const now = new Date();
        for (const alert of staleAlerts) {
            await prisma.alertGroup.update({
                where: { id: alert.id },
                data: {
                    status: AlertStatus.RESOLVED,
                    resolvedAt: now,
                    snoozeUntil: null,
                },
            });

            // Cancel any pending escalations
            await this.escalationService.cancelEscalation(alert.id);

            this.logger.log(`Auto-closed stale alert`, {
                alertGroupId: alert.id,
                title: alert.title,
                lastSeenAt: alert.lastSeenAt,
            });
        }

        this.logger.log(`Auto-close completed`, {
            workspaceId,
            closedCount: staleAlerts.length,
            inactivityDays,
        });

        return {
            closedCount: staleAlerts.length,
            closedIds: staleAlerts.map((a) => a.id),
        };
    }

    /**
     * Get hygiene statistics for a workspace
     */
    async getHygieneStats(workspaceId: string) {
        const [open, ack, snoozed, resolved, totalCount] = await Promise.all([
            prisma.alertGroup.count({ where: { workspaceId, status: AlertStatus.OPEN } }),
            prisma.alertGroup.count({ where: { workspaceId, status: AlertStatus.ACK } }),
            prisma.alertGroup.count({ where: { workspaceId, status: AlertStatus.SNOOZED } }),
            prisma.alertGroup.count({ where: { workspaceId, status: AlertStatus.RESOLVED } }),
            prisma.alertGroup.count({ where: { workspaceId } }),
        ]);

        // Get alerts with expired snoozes
        const expiredSnoozes = await prisma.alertGroup.count({
            where: {
                workspaceId,
                status: AlertStatus.SNOOZED,
                snoozeUntil: { lt: new Date() },
            },
        });

        // Get stale alerts (no activity in 7 days)
        const staleThreshold = new Date(Date.now() - this.defaultAutoCloseDays * 24 * 60 * 60 * 1000);
        const staleAlerts = await prisma.alertGroup.count({
            where: {
                workspaceId,
                status: { in: [AlertStatus.OPEN, AlertStatus.ACK] },
                lastSeenAt: { lt: staleThreshold },
            },
        });

        return {
            total: totalCount,
            byStatus: {
                open,
                acknowledged: ack,
                snoozed,
                resolved,
            },
            expiredSnoozes,
            staleAlerts,
            autoCloseThresholdDays: this.defaultAutoCloseDays,
        };
    }
}

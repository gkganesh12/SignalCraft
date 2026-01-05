/**
 * Hygiene Processor
 * 
 * BullMQ worker that processes hygiene jobs:
 * - Auto-close stale alerts
 * - Process expired snoozes
 * 
 * @module alerts/hygiene/hygiene.processor
 */
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma, AlertStatus } from '@signalcraft/database';

interface HygieneJobData {
    type: 'auto-close' | 'expired-snoozes';
    workspaceId?: string; // Optional - if not provided, process all workspaces
}

@Injectable()
export class HygieneProcessor implements OnModuleDestroy {
    private readonly logger = new Logger(HygieneProcessor.name);
    private worker: Worker | null = null;

    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            this.logger.warn('Redis URL not configured - hygiene processor disabled');
            return;
        }

        const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

        this.worker = new Worker(
            'hygiene',
            async (job: Job<HygieneJobData>) => {
                await this.processJob(job);
            },
            {
                connection,
                concurrency: 1, // Process one job at a time
            },
        );

        this.worker.on('completed', (job) => {
            this.logger.debug(`Hygiene job completed: ${job.name}`, { jobId: job.id });
        });

        this.worker.on('failed', (job, error) => {
            this.logger.error(`Hygiene job failed: ${job?.name}`, {
                jobId: job?.id,
                error: error.message,
            });
        });

        this.logger.log('Hygiene processor initialized');
    }

    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
            this.logger.log('Hygiene processor shut down');
        }
    }

    private async processJob(job: Job<HygieneJobData>) {
        const { type, workspaceId } = job.data;

        this.logger.log(`Processing hygiene job: ${type}`, { workspaceId });

        switch (type) {
            case 'auto-close':
                await this.processAutoClose(workspaceId);
                break;
            case 'expired-snoozes':
                await this.processExpiredSnoozes(workspaceId);
                break;
            default:
                this.logger.warn(`Unknown hygiene job type: ${type}`);
        }
    }

    /**
     * Auto-close stale alerts that haven't had activity
     */
    private async processAutoClose(workspaceId?: string) {
        const inactivityDays = parseInt(process.env.AUTO_CLOSE_DAYS ?? '7', 10);
        const thresholdDate = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);

        // Get all workspaces or specific one
        const workspaces = workspaceId
            ? [{ id: workspaceId }]
            : await prisma.workspace.findMany({ select: { id: true } });

        let totalClosed = 0;

        for (const ws of workspaces) {
            const staleAlerts = await prisma.alertGroup.findMany({
                where: {
                    workspaceId: ws.id,
                    status: { in: [AlertStatus.OPEN, AlertStatus.ACK] },
                    lastSeenAt: { lt: thresholdDate },
                },
                select: { id: true, title: true },
            });

            if (staleAlerts.length === 0) continue;

            // Close all stale alerts in this workspace
            await prisma.alertGroup.updateMany({
                where: {
                    id: { in: staleAlerts.map((a) => a.id) },
                },
                data: {
                    status: AlertStatus.RESOLVED,
                    resolvedAt: new Date(),
                    snoozeUntil: null,
                },
            });

            totalClosed += staleAlerts.length;

            this.logger.log(`Auto-closed ${staleAlerts.length} stale alerts`, {
                workspaceId: ws.id,
                inactivityDays,
            });
        }

        this.logger.log(`Auto-close job completed`, { totalClosed, workspaceCount: workspaces.length });
    }

    /**
     * Process alerts with expired snoozes - reopen them
     */
    private async processExpiredSnoozes(workspaceId?: string) {
        const now = new Date();

        const whereClause = {
            status: AlertStatus.SNOOZED,
            snoozeUntil: { lt: now },
            ...(workspaceId ? { workspaceId } : {}),
        };

        // Find all expired snoozes
        const expiredSnoozes = await prisma.alertGroup.findMany({
            where: whereClause,
            select: { id: true, workspaceId: true, title: true },
        });

        if (expiredSnoozes.length === 0) {
            return;
        }

        // Reopen all expired snoozes
        await prisma.alertGroup.updateMany({
            where: {
                id: { in: expiredSnoozes.map((a) => a.id) },
            },
            data: {
                status: AlertStatus.OPEN,
                snoozeUntil: null,
            },
        });

        this.logger.log(`Processed ${expiredSnoozes.length} expired snoozes`, {
            alertIds: expiredSnoozes.map((a) => a.id),
        });
    }
}

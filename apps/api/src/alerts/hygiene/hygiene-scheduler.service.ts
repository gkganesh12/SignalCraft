/**
 * Hygiene Scheduler Service
 * 
 * Schedules recurring jobs for alert hygiene tasks:
 * - Auto-close stale alerts
 * - Process expired snoozes
 * 
 * @module alerts/hygiene/hygiene-scheduler.service
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class HygieneSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(HygieneSchedulerService.name);
    private queue: Queue | null = null;
    private readonly scheduledJobIds: string[] = [];

    async onModuleInit() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            this.logger.warn('Redis URL not configured - hygiene scheduler disabled');
            return;
        }

        const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
        this.queue = new Queue('hygiene', { connection });

        await this.scheduleRecurringJobs();
        this.logger.log('Hygiene scheduler initialized');
    }

    async onModuleDestroy() {
        if (this.queue) {
            // Remove scheduled jobs
            for (const jobId of this.scheduledJobIds) {
                try {
                    const job = await this.queue.getJob(jobId);
                    if (job) await job.remove();
                } catch (err) {
                    this.logger.warn(`Failed to remove scheduled job: ${jobId}`);
                }
            }
            await this.queue.close();
            this.logger.log('Hygiene scheduler shut down');
        }
    }

    private async scheduleRecurringJobs() {
        if (!this.queue) return;

        // Schedule auto-close job - runs daily at 2 AM
        const autoCloseJob = await this.queue.add(
            'auto-close-stale',
            { type: 'auto-close' },
            {
                repeat: {
                    pattern: '0 2 * * *', // 2 AM every day
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        );
        if (autoCloseJob.id) {
            this.scheduledJobIds.push(autoCloseJob.id);
        }
        this.logger.log('Scheduled auto-close job (daily at 2 AM)');

        // Schedule expired snooze check - runs every 5 minutes
        const snoozeCheckJob = await this.queue.add(
            'process-expired-snoozes',
            { type: 'expired-snoozes' },
            {
                repeat: {
                    pattern: '*/5 * * * *', // Every 5 minutes
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        );
        if (snoozeCheckJob.id) {
            this.scheduledJobIds.push(snoozeCheckJob.id);
        }
        this.logger.log('Scheduled snooze expiry check (every 5 minutes)');
    }
}

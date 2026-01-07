import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { prisma } from '@signalcraft/database';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    // Retention periods in days (could be moved to ConfigService)
    private readonly EVENT_RETENTION_DAYS = 90;
    private readonly LOG_RETENTION_DAYS = 30;

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyCleanup() {
        this.logger.log('Starting daily cleanup job...');

        try {
            await this.cleanupOldEvents();
            await this.cleanupOldNotificationLogs();
            this.logger.log('Daily cleanup completed successfully.');
        } catch (error) {
            this.logger.error('Error during daily cleanup:', error);
        }
    }

    private async cleanupOldEvents() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.EVENT_RETENTION_DAYS);

        const result = await prisma.alertEvent.deleteMany({
            where: {
                occurredAt: {
                    lt: cutoffDate,
                },
            },
        });

        this.logger.log(`Deleted ${result.count} alert events older than ${this.EVENT_RETENTION_DAYS} days.`);
    }

    private async cleanupOldNotificationLogs() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.LOG_RETENTION_DAYS);

        const result = await prisma.notificationLog.deleteMany({
            where: {
                sentAt: {
                    lt: cutoffDate,
                },
            },
        });

        this.logger.log(`Deleted ${result.count} notification logs older than ${this.LOG_RETENTION_DAYS} days.`);
    }
}

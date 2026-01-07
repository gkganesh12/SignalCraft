/**
 * Dashboard Service
 * 
 * Provides dashboard metrics and analytics for the workspace overview.
 * Calculates real-time metrics including alert counts, deduplication ratio,
 * acknowledgment rate, top noisy sources, and integration health.
 * 
 * @module dashboard/dashboard.service
 */
import { Injectable, Logger } from '@nestjs/common';
import { prisma, AlertStatus, IntegrationType, IntegrationStatus, Prisma } from '@signalcraft/database';

export interface MetricTrend {
    value: number;
    previousValue: number;
    trend: 'up' | 'down' | 'same';
    trendPercent: number;
}

export interface AlertMetrics {
    groups: MetricTrend;
    events: MetricTrend;
}

export interface TopSource {
    project: string;
    environment: string;
    count: number;
    percentage: number;
}

export interface IntegrationHealthStatus {
    id: string;
    type: string;
    name: string;
    connected: boolean;
    healthy: boolean;
    lastActivity: Date | null;
    status: 'healthy' | 'warning' | 'error' | 'disconnected';
}

export interface DashboardOverview {
    alerts24h: AlertMetrics;
    deduplicationRatio: MetricTrend;
    acknowledgmentRate: MetricTrend;
    topNoisySources: TopSource[];
    integrationHealth: IntegrationHealthStatus[];
    generatedAt: Date;
}

export interface HourlyBucket {
    hour: string;
    count: number;
}

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    /**
     * Get complete dashboard overview metrics
     */
    async getOverviewMetrics(workspaceId: string): Promise<DashboardOverview> {
        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const prev24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            const [
                alerts24h,
                deduplicationRatio,
                acknowledgmentRate,
                topNoisySources,
                integrationHealth,
            ] = await Promise.all([
                this.getAlerts24h(workspaceId, now, last24h, prev24h),
                this.getDeduplicationRatio(workspaceId, now, last24h, prev24h),
                this.getAcknowledgmentRate(workspaceId, now, last24h, prev24h),
                this.getTopNoisySources(workspaceId, last24h),
                this.getIntegrationHealth(workspaceId),
            ]);

            return {
                alerts24h,
                deduplicationRatio,
                acknowledgmentRate,
                topNoisySources,
                integrationHealth,
                generatedAt: now,
            };
        } catch (error) {
            this.logger.error(`Failed to get overview metrics for workspace ${workspaceId}`, error);
            throw error;
        }
    }

    /**
     * Get alert counts for last 24h with trend
     */
    private async getAlerts24h(
        workspaceId: string,
        now: Date,
        last24h: Date,
        prev24h: Date,
    ): Promise<AlertMetrics> {
        // Current period groups
        const currentGroups = await prisma.alertGroup.count({
            where: {
                workspaceId,
                createdAt: { gte: last24h, lte: now },
            },
        });

        // Previous period groups
        const previousGroups = await prisma.alertGroup.count({
            where: {
                workspaceId,
                createdAt: { gte: prev24h, lt: last24h },
            },
        });

        // Current period events
        const currentEvents = await prisma.alertEvent.count({
            where: {
                workspaceId,
                receivedAt: { gte: last24h, lte: now },
            },
        });

        // Previous period events
        const previousEvents = await prisma.alertEvent.count({
            where: {
                workspaceId,
                receivedAt: { gte: prev24h, lt: last24h },
            },
        });

        return {
            groups: this.calculateTrend(currentGroups, previousGroups),
            events: this.calculateTrend(currentEvents, previousEvents),
        };
    }

    /**
     * Calculate deduplication ratio
     * Ratio = (1 - groups/events) * 100
     * Higher is better (more events grouped together)
     */
    private async getDeduplicationRatio(
        workspaceId: string,
        now: Date,
        last24h: Date,
        prev24h: Date,
    ): Promise<MetricTrend> {
        const [currentGroups, currentEvents, prevGroups, prevEvents] = await Promise.all([
            prisma.alertGroup.count({
                where: { workspaceId, createdAt: { gte: last24h, lte: now } },
            }),
            prisma.alertEvent.count({
                where: { workspaceId, receivedAt: { gte: last24h, lte: now } },
            }),
            prisma.alertGroup.count({
                where: { workspaceId, createdAt: { gte: prev24h, lt: last24h } },
            }),
            prisma.alertEvent.count({
                where: { workspaceId, receivedAt: { gte: prev24h, lt: last24h } },
            }),
        ]);

        const currentRatio = currentEvents > 0
            ? Math.round((1 - currentGroups / currentEvents) * 100)
            : 0;
        const previousRatio = prevEvents > 0
            ? Math.round((1 - prevGroups / prevEvents) * 100)
            : 0;

        return this.calculateTrend(currentRatio, previousRatio);
    }

    /**
     * Calculate acknowledgment rate
     * Rate = (acknowledged + resolved) / total * 100
     */
    private async getAcknowledgmentRate(
        workspaceId: string,
        now: Date,
        last24h: Date,
        prev24h: Date,
    ): Promise<MetricTrend> {
        // Current period
        const [currentTotal, currentAcked] = await Promise.all([
            prisma.alertGroup.count({
                where: { workspaceId, createdAt: { gte: last24h, lte: now } },
            }),
            prisma.alertGroup.count({
                where: {
                    workspaceId,
                    createdAt: { gte: last24h, lte: now },
                    status: { in: [AlertStatus.ACK, AlertStatus.RESOLVED] },
                },
            }),
        ]);

        // Previous period
        const [prevTotal, prevAcked] = await Promise.all([
            prisma.alertGroup.count({
                where: { workspaceId, createdAt: { gte: prev24h, lt: last24h } },
            }),
            prisma.alertGroup.count({
                where: {
                    workspaceId,
                    createdAt: { gte: prev24h, lt: last24h },
                    status: { in: [AlertStatus.ACK, AlertStatus.RESOLVED] },
                },
            }),
        ]);

        const currentRate = currentTotal > 0 ? Math.round((currentAcked / currentTotal) * 100) : 0;
        const previousRate = prevTotal > 0 ? Math.round((prevAcked / prevTotal) * 100) : 0;

        return this.calculateTrend(currentRate, previousRate);
    }

    /**
     * Get top noisy sources (projects with most alerts)
     */
    /**
     * Get top noisy sources (projects with most alerts)
     */
    private async getTopNoisySources(
        workspaceId: string,
        since: Date,
    ): Promise<TopSource[]> {
        const results = await prisma.alertGroup.groupBy({
            by: ['project', 'environment'],
            where: {
                workspaceId,
                createdAt: { gte: since },
            },
            _count: {
                _all: true,
            },
            orderBy: {
                _count: {
                    project: 'desc', // Orders by count
                },
            },
            take: 10,
        });

        // Calculate total for percentage
        const total = results.reduce((sum, r) => sum + r._count._all, 0);

        return results.map((r) => ({
            project: r.project,
            environment: r.environment,
            count: r._count._all,
            percentage: total > 0 ? Math.round((r._count._all / total) * 100) : 0,
        }));
    }

    /**
     * Get integration health status
     */
    private async getIntegrationHealth(
        workspaceId: string,
    ): Promise<IntegrationHealthStatus[]> {
        const integrations = await prisma.integration.findMany({
            where: { workspaceId },
        });

        const healthStatuses: IntegrationHealthStatus[] = [];
        const now = new Date();
        const warningThreshold = 60 * 60 * 1000; // 1 hour
        const errorThreshold = 24 * 60 * 60 * 1000; // 24 hours

        for (const integration of integrations) {
            // Get last notification for this workspace
            const lastNotification = await prisma.notificationLog.findFirst({
                where: { workspaceId },
                orderBy: { sentAt: 'desc' },
            });

            const lastActivity = lastNotification?.sentAt ?? null;
            const timeSinceActivity = lastActivity
                ? now.getTime() - lastActivity.getTime()
                : Infinity;

            // Check if integration has config (connected)
            const config = integration.configJson as Record<string, unknown>;
            const isConnected = integration.status === IntegrationStatus.ACTIVE &&
                (config?.accessToken || config?.webhookUrl || Object.keys(config || {}).length > 0);

            let status: 'healthy' | 'warning' | 'error' | 'disconnected';
            let healthy = true;

            if (!isConnected) {
                status = 'disconnected';
                healthy = false;
            } else if (timeSinceActivity > errorThreshold) {
                status = 'error';
                healthy = false;
            } else if (timeSinceActivity > warningThreshold) {
                status = 'warning';
                healthy = true;
            } else {
                status = 'healthy';
                healthy = true;
            }

            healthStatuses.push({
                id: integration.id,
                type: integration.type,
                name: this.getIntegrationName(integration.type),
                connected: !!isConnected,
                healthy,
                lastActivity,
                status,
            });
        }

        return healthStatuses;
    }

    /**
     * Get hourly alert trend data for charts
     */
    async getAlertsTrend(workspaceId: string, hours = 24): Promise<HourlyBucket[]> {
        const now = new Date();
        const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const events = await prisma.alertEvent.findMany({
            where: {
                workspaceId,
                receivedAt: { gte: since },
            },
            select: { receivedAt: true },
            orderBy: { receivedAt: 'asc' },
        });

        // Create hourly buckets
        const buckets: Map<string, number> = new Map();
        for (let i = 0; i < hours; i++) {
            const bucketTime = new Date(now.getTime() - (hours - i - 1) * 60 * 60 * 1000);
            const key = bucketTime.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            buckets.set(key, 0);
        }

        // Count events per bucket
        for (const event of events) {
            const key = event.receivedAt.toISOString().slice(0, 13);
            if (buckets.has(key)) {
                buckets.set(key, (buckets.get(key) ?? 0) + 1);
            }
        }

        return Array.from(buckets.entries()).map(([hour, count]) => ({
            hour,
            count,
        }));
    }

    /**
     * Calculate trend between current and previous values
     */
    private calculateTrend(current: number, previous: number): MetricTrend {
        let trend: 'up' | 'down' | 'same' = 'same';
        let trendPercent = 0;

        if (previous > 0) {
            trendPercent = Math.round(((current - previous) / previous) * 100);
            if (current > previous) trend = 'up';
            else if (current < previous) trend = 'down';
        } else if (current > 0) {
            trend = 'up';
            trendPercent = 100;
        }

        return {
            value: current,
            previousValue: previous,
            trend,
            trendPercent: Math.abs(trendPercent),
        };
    }

    private getIntegrationName(type: IntegrationType): string {
        switch (type) {
            case IntegrationType.SLACK:
                return 'Slack';
            case IntegrationType.SENTRY:
                return 'Sentry';
            default:
                return type;
        }
    }

    /**
     * Get detailed analytics for the analytics page
     */
    async getAnalytics(workspaceId: string, range: string) {
        const now = new Date();
        let hours: number;

        switch (range) {
            case '24h':
                hours = 24;
                break;
            case '30d':
                hours = 30 * 24;
                break;
            case '7d':
            default:
                hours = 7 * 24;
        }

        const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

        // Get all alerts in the time range
        const alertGroups = await prisma.alertGroup.findMany({
            where: {
                workspaceId,
                createdAt: { gte: since },
            },
            select: {
                id: true,
                severity: true,
                project: true,
                environment: true,
                status: true,
                createdAt: true,
                resolvedAt: true,
            },
        });

        // Alerts over time - group by day or hour depending on range
        const alertsOverTime: { date: string; count: number }[] = [];
        const bucketCount = range === '24h' ? 24 : range === '7d' ? 7 : 30;
        const bucketSize = hours / bucketCount;

        for (let i = bucketCount - 1; i >= 0; i--) {
            const bucketStart = new Date(now.getTime() - (i + 1) * bucketSize * 60 * 60 * 1000);
            const bucketEnd = new Date(now.getTime() - i * bucketSize * 60 * 60 * 1000);

            const count = alertGroups.filter(ag =>
                ag.createdAt >= bucketStart && ag.createdAt < bucketEnd
            ).length;

            alertsOverTime.push({
                date: range === '24h'
                    ? bucketEnd.toLocaleTimeString('en-US', { hour: 'numeric' })
                    : bucketEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count,
            });
        }

        // Alerts by severity
        const severityCounts = new Map<string, number>();
        alertGroups.forEach(ag => {
            severityCounts.set(ag.severity, (severityCounts.get(ag.severity) || 0) + 1);
        });
        const alertsBySeverity = Array.from(severityCounts.entries())
            .map(([severity, count]) => ({ severity, count }))
            .sort((a, b) => {
                const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
                return order.indexOf(a.severity) - order.indexOf(b.severity);
            });

        // Alerts by project
        const projectCounts = new Map<string, number>();
        alertGroups.forEach(ag => {
            projectCounts.set(ag.project, (projectCounts.get(ag.project) || 0) + 1);
        });
        const alertsByProject = Array.from(projectCounts.entries())
            .map(([project, count]) => ({ project, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Alerts by environment
        const envCounts = new Map<string, number>();
        alertGroups.forEach(ag => {
            envCounts.set(ag.environment, (envCounts.get(ag.environment) || 0) + 1);
        });
        const alertsByEnvironment = Array.from(envCounts.entries())
            .map(([environment, count]) => ({ environment, count }))
            .sort((a, b) => b.count - a.count);

        // Summary metrics
        const totalAlerts = alertGroups.length;
        const resolvedAlerts = alertGroups.filter(ag => ag.status === 'RESOLVED').length;
        const openAlerts = alertGroups.filter(ag => ag.status === 'OPEN').length;
        const resolutionRate = totalAlerts > 0
            ? Math.round((resolvedAlerts / totalAlerts) * 1000) / 10
            : 0;

        // Calculate MTTR (Mean Time To Resolution) in minutes
        const resolvedWithTime = alertGroups.filter(ag => ag.status === 'RESOLVED' && ag.resolvedAt);
        let mttr = 0;
        if (resolvedWithTime.length > 0) {
            const totalResolutionTime = resolvedWithTime.reduce((sum, ag) => {
                const resolutionTime = (ag.resolvedAt!.getTime() - ag.createdAt.getTime()) / (1000 * 60);
                return sum + resolutionTime;
            }, 0);
            mttr = Math.round(totalResolutionTime / resolvedWithTime.length);
        }

        return {
            alertsOverTime,
            alertsBySeverity,
            alertsByProject,
            alertsByEnvironment,
            totalAlerts,
            resolvedAlerts,
            openAlerts,
            mttr,
            resolutionRate,
            resolvedAverageTime: mttr,
        };
    }
}

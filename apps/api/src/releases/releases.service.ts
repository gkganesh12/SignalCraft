import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

interface CreateReleaseDto {
    version: string;
    environment: string;
    commitSha?: string;
    deployedAt?: Date;
}

export interface ReleaseHealth {
    id: string;
    version: string;
    environment: string;
    deployedAt: Date;
    errorCount: number;
    affectedUsers: number;
    deltaFromPrevious: number; // +/- compared to previous release
}

@Injectable()
export class ReleasesService {
    private readonly logger = new Logger(ReleasesService.name);

    async createRelease(workspaceId: string, data: CreateReleaseDto) {
        const release = await prisma.release.upsert({
            where: {
                workspaceId_version_environment: {
                    workspaceId,
                    version: data.version,
                    environment: data.environment,
                },
            },
            update: {
                commitSha: data.commitSha,
                deployedAt: data.deployedAt ?? new Date(),
            },
            create: {
                workspaceId,
                version: data.version,
                environment: data.environment,
                commitSha: data.commitSha,
                deployedAt: data.deployedAt ?? new Date(),
            },
        });

        this.logger.log(`Release created/updated: ${release.version} (${release.environment})`);
        return release;
    }

    async listReleases(workspaceId: string, limit = 20) {
        return prisma.release.findMany({
            where: { workspaceId },
            orderBy: { deployedAt: 'desc' },
            take: limit,
            include: {
                _count: {
                    select: { alertGroups: true },
                },
            },
        });
    }

    async getReleaseById(workspaceId: string, releaseId: string) {
        return prisma.release.findFirst({
            where: { id: releaseId, workspaceId },
            include: {
                alertGroups: {
                    take: 10,
                    orderBy: { lastSeenAt: 'desc' },
                },
                _count: {
                    select: { alertGroups: true },
                },
            },
        });
    }

    async getReleaseHealth(workspaceId: string, releaseId: string): Promise<ReleaseHealth | null> {
        const release = await prisma.release.findFirst({
            where: { id: releaseId, workspaceId },
        });

        if (!release) return null;

        // Get error count and affected users for this release
        const stats = await prisma.alertGroup.aggregate({
            where: { releaseId, workspaceId },
            _count: { id: true },
            _sum: { userCount: true },
        });

        // Find previous release in same environment
        const previousRelease = await prisma.release.findFirst({
            where: {
                workspaceId,
                environment: release.environment,
                deployedAt: { lt: release.deployedAt },
            },
            orderBy: { deployedAt: 'desc' },
        });

        let deltaFromPrevious = 0;
        if (previousRelease) {
            const prevStats = await prisma.alertGroup.aggregate({
                where: { releaseId: previousRelease.id, workspaceId },
                _count: { id: true },
            });
            deltaFromPrevious = (stats._count?.id ?? 0) - (prevStats._count?.id ?? 0);
        }

        return {
            id: release.id,
            version: release.version,
            environment: release.environment,
            deployedAt: release.deployedAt,
            errorCount: stats._count?.id ?? 0,
            affectedUsers: stats._sum?.userCount ?? 0,
            deltaFromPrevious,
        };
    }

    async getRecentReleasesWithHealth(workspaceId: string, limit = 5): Promise<ReleaseHealth[]> {
        const releases = await prisma.release.findMany({
            where: { workspaceId },
            orderBy: { deployedAt: 'desc' },
            take: limit,
        });

        const healthPromises = releases.map((r) => this.getReleaseHealth(workspaceId, r.id));
        const results = await Promise.all(healthPromises);
        return results.filter((r): r is ReleaseHealth => r !== null);
    }

    // Called when processing incoming alerts to link them to the current release
    async linkAlertToRelease(workspaceId: string, alertGroupId: string, version: string, environment: string) {
        // Find or create the release
        let release = await prisma.release.findUnique({
            where: {
                workspaceId_version_environment: {
                    workspaceId,
                    version,
                    environment,
                },
            },
        });

        if (!release) {
            release = await this.createRelease(workspaceId, { version, environment });
        }

        // Link the alert group to this release
        await prisma.alertGroup.update({
            where: { id: alertGroupId },
            data: { releaseId: release.id },
        });

        return release;
    }
}

import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { ReleasesService } from './releases.service';

class CreateReleaseDto {
    version!: string;
    environment!: string;
    commitSha?: string;
    deployedAt?: string;
}

@ApiTags('releases')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/releases')
export class ReleasesController {
    constructor(private readonly releasesService: ReleasesService) { }

    @Post()
    @ApiOperation({ summary: 'Create or update a release' })
    async createRelease(
        @WorkspaceId() workspaceId: string,
        @Body() dto: CreateReleaseDto,
    ) {
        return this.releasesService.createRelease(workspaceId, {
            version: dto.version,
            environment: dto.environment,
            commitSha: dto.commitSha,
            deployedAt: dto.deployedAt ? new Date(dto.deployedAt) : undefined,
        });
    }

    @Get()
    @ApiOperation({ summary: 'List releases' })
    async listReleases(
        @WorkspaceId() workspaceId: string,
        @Query('limit') limit?: string,
    ) {
        return this.releasesService.listReleases(workspaceId, limit ? parseInt(limit, 10) : 20);
    }

    @Get('health')
    @ApiOperation({ summary: 'Get recent releases with health stats' })
    async getReleasesHealth(
        @WorkspaceId() workspaceId: string,
        @Query('limit') limit?: string,
    ) {
        return this.releasesService.getRecentReleasesWithHealth(workspaceId, limit ? parseInt(limit, 10) : 5);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a release by ID' })
    async getRelease(
        @WorkspaceId() workspaceId: string,
        @Param('id') releaseId: string,
    ) {
        return this.releasesService.getReleaseById(workspaceId, releaseId);
    }

    @Get(':id/health')
    @ApiOperation({ summary: 'Get health stats for a release' })
    async getReleaseHealth(
        @WorkspaceId() workspaceId: string,
        @Param('id') releaseId: string,
    ) {
        return this.releasesService.getReleaseHealth(workspaceId, releaseId);
    }
}

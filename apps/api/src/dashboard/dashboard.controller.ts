/**
 * Dashboard Controller
 * 
 * REST API endpoints for dashboard metrics and analytics.
 * 
 * @module dashboard/dashboard.controller
 */
import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('api/dashboard')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(CacheInterceptor)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get dashboard overview metrics' })
    @CacheTTL(60000) // 1 minute
    async getOverview(@WorkspaceId() workspaceId: string) {
        try {
            return await this.dashboardService.getOverviewMetrics(workspaceId);
        } catch (error) {
            console.error('Controller Caught Error:', error);
            return {
                _debug_error: true,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                raw: String(error)
            };
        }
    }

    @Get('alerts-trend')
    @ApiOperation({ summary: 'Get hourly alert trend data for charts' })
    @CacheTTL(300000) // 5 minutes
    async getAlertsTrend(@WorkspaceId() workspaceId: string) {
        return this.dashboardService.getAlertsTrend(workspaceId);
    }

    @Get('analytics')
    @ApiOperation({ summary: 'Get detailed analytics for operational insights' })
    @ApiQuery({ name: 'range', required: false, enum: ['24h', '7d', '30d'] })
    @CacheTTL(300000) // 5 minutes
    async getAnalytics(
        @WorkspaceId() workspaceId: string,
        @Query('range') range?: string,
    ) {
        return this.dashboardService.getAnalytics(workspaceId, range || '7d');
    }
}

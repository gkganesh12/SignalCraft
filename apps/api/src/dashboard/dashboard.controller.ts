/**
 * Dashboard Controller
 * 
 * REST API endpoints for dashboard metrics and analytics.
 * 
 * @module dashboard/dashboard.controller
 */
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
        return this.dashboardService.getOverviewMetrics(workspaceId);
    }

    @Get('alerts-trend')
    @ApiOperation({ summary: 'Get hourly alert trend data for charts' })
    @CacheTTL(300000) // 5 minutes
    async getAlertsTrend(@WorkspaceId() workspaceId: string) {
        return this.dashboardService.getAlertsTrend(workspaceId);
    }
}

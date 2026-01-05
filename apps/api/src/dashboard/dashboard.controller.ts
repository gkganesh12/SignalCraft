/**
 * Dashboard Controller
 * 
 * REST API endpoints for dashboard metrics and analytics.
 * 
 * @module dashboard/dashboard.controller
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('api/dashboard')
@UseGuards(ClerkAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get dashboard overview metrics' })
    async getOverview(@WorkspaceId() workspaceId: string) {
        return this.dashboardService.getOverviewMetrics(workspaceId);
    }

    @Get('alerts-trend')
    @ApiOperation({ summary: 'Get hourly alert trend data for charts' })
    async getAlertsTrend(@WorkspaceId() workspaceId: string) {
        return this.dashboardService.getAlertsTrend(workspaceId);
    }
}

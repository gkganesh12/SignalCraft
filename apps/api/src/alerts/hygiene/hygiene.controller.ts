/**
 * Hygiene Controller
 * 
 * API endpoints for alert hygiene operations.
 * 
 * @module alerts/hygiene.controller
 */
import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../auth/clerk-auth.guard';
import { WorkspaceId } from '../../common/decorators/workspace-id.decorator';
import { HygieneService } from './hygiene.service';

@ApiTags('alert-hygiene')
@ApiBearerAuth()
@Controller('api/alert-groups')
@UseGuards(ClerkAuthGuard)
export class HygieneController {
    private readonly logger = new Logger(HygieneController.name);

    constructor(private readonly hygieneService: HygieneService) { }

    @Post(':id/snooze')
    @ApiOperation({ summary: 'Snooze an alert group' })
    @ApiResponse({ status: 200, description: 'Alert snoozed successfully' })
    @ApiResponse({ status: 404, description: 'Alert not found' })
    @ApiResponse({ status: 400, description: 'Cannot snooze resolved alert' })
    async snoozeAlert(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
        @Body() body: { durationHours?: number },
    ) {
        return this.hygieneService.snoozeAlertGroup(workspaceId, alertGroupId, {
            durationHours: body.durationHours ?? 1,
        });
    }

    @Post(':id/unsnooze')
    @ApiOperation({ summary: 'Unsnooze an alert group' })
    @ApiResponse({ status: 200, description: 'Alert unsnoozed successfully' })
    @ApiResponse({ status: 404, description: 'Alert not found' })
    @ApiResponse({ status: 400, description: 'Alert is not snoozed' })
    async unsnoozeAlert(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
    ) {
        return this.hygieneService.unsnoozeAlertGroup(workspaceId, alertGroupId);
    }

    @Post(':id/resolve')
    @ApiOperation({ summary: 'Manually resolve an alert group' })
    @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
    @ApiResponse({ status: 404, description: 'Alert not found' })
    async resolveAlert(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
    ) {
        return this.hygieneService.resolveAlertGroup(workspaceId, alertGroupId);
    }

    @Post(':id/acknowledge')
    @ApiOperation({ summary: 'Acknowledge an alert group' })
    @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
    @ApiResponse({ status: 404, description: 'Alert not found' })
    @ApiResponse({ status: 400, description: 'Cannot acknowledge resolved alert' })
    async acknowledgeAlert(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
    ) {
        return this.hygieneService.acknowledgeAlertGroup(workspaceId, alertGroupId);
    }

    @Get('hygiene/stats')
    @ApiOperation({ summary: 'Get hygiene statistics for the workspace' })
    @ApiResponse({ status: 200, description: 'Hygiene statistics' })
    async getHygieneStats(@WorkspaceId() workspaceId: string) {
        return this.hygieneService.getHygieneStats(workspaceId);
    }

    @Post('hygiene/auto-close')
    @ApiOperation({ summary: 'Auto-close stale alerts' })
    @ApiQuery({ name: 'inactivityDays', required: false, type: Number })
    @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Auto-close result' })
    async autoCloseStaleAlerts(
        @WorkspaceId() workspaceId: string,
        @Query('inactivityDays') inactivityDays?: string,
        @Query('dryRun') dryRun?: string,
    ) {
        return this.hygieneService.autoCloseStaleAlerts({
            workspaceId,
            inactivityDays: inactivityDays ? parseInt(inactivityDays, 10) : 7,
            dryRun: dryRun === 'true',
        });
    }

    @Post('hygiene/process-expired-snoozes')
    @ApiOperation({ summary: 'Process all expired snoozes' })
    @ApiResponse({ status: 200, description: 'Number of snoozes processed' })
    async processExpiredSnoozes(@WorkspaceId() workspaceId: string) {
        const count = await this.hygieneService.processExpiredSnoozes(workspaceId);
        return { processedCount: count };
    }
}

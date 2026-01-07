import { BadRequestException, Controller, Get, Param, Query, UseGuards, NotFoundException, Post, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AlertsService, AlertGroupFilters, PaginationOptions, SortOptions } from './alerts.service';
import { CorrelationService } from './correlation.service';
import { PostmortemService } from './postmortem.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { AlertStatus, AlertSeverity } from '@signalcraft/database';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/alert-groups')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly correlationService: CorrelationService,
    private readonly postmortemService: PostmortemService,
  ) { }

  // ... existing code ...

  @Post(':id/postmortem')
  async generatePostmortem(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    const report = await this.postmortemService.generatePostmortem(workspaceId, groupId);
    return { report };
  }

  @Get(':id/related')
  async getRelatedAlerts(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    return this.correlationService.getCorrelatedAlerts(workspaceId, groupId);
  }

  @Post('analyze-correlations')
  async triggerCorrelationAnalysis(@WorkspaceId() workspaceId: string) {
    // Fire and forget for now, or await if fast enough. 
    // For large datasets, this should be a job.
    this.correlationService.analyzeCorrelations(workspaceId);
    return { message: 'Correlation analysis queued' };
  }

  @Get('anomalies')
  async getAnomalies(@WorkspaceId() workspaceId: string) {
    return this.alertsService.getAnomalies(workspaceId);
  }

  @Get()
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (comma-separated)' })
  @ApiQuery({ name: 'severity', required: false, type: String, description: 'Filter by severity (comma-separated)' })
  @ApiQuery({ name: 'environment', required: false, type: String, description: 'Filter by environment (comma-separated)' })
  @ApiQuery({ name: 'project', required: false, type: String, description: 'Filter by project (comma-separated)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  async listAlertGroups(
    @WorkspaceId() workspaceId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('environment') environment?: string,
    @Query('project') project?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const filters: AlertGroupFilters = {};

    if (status) {
      filters.status = status.split(',').map((s) => s.toUpperCase()) as AlertStatus[];
    }
    if (severity) {
      filters.severity = severity.split(',').map((s) => s.toUpperCase()) as AlertSeverity[];
    }
    if (environment) {
      filters.environment = environment.split(',');
    }
    if (project) {
      filters.project = project.split(',');
    }
    if (search) {
      filters.search = search;
    }

    const pagination: PaginationOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    };

    const sort: SortOptions = {
      sortBy: (sortBy as SortOptions['sortBy']) || 'lastSeenAt',
      sortOrder: (sortOrder as SortOptions['sortOrder']) || 'desc',
    };

    return this.alertsService.listAlertGroups(workspaceId, filters, pagination, sort);
  }

  @Get('filter-options')
  async getFilterOptions(@WorkspaceId() workspaceId: string) {
    return this.alertsService.getFilterOptions(workspaceId);
  }

  @Get(':id')
  async getAlertGroupDetail(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    const group = await this.alertsService.getAlertGroupDetail(workspaceId, groupId);
    if (!group) {
      throw new NotFoundException('Alert group not found');
    }
    return group;
  }

  @Get(':id/events')
  async listEvents(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    return this.alertsService.listEvents(workspaceId, groupId);
  }

  @Get(':id/breadcrumbs')
  async getBreadcrumbs(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    return this.alertsService.getBreadcrumbs(workspaceId, groupId);
  }

  @Get(':id/ai-suggestion')
  async getAiSuggestion(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    const result = await this.alertsService.getAiSuggestion(workspaceId, groupId);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Post(':id/acknowledge')
  async acknowledgeAlert(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    const result = await this.alertsService.acknowledgeAlert(workspaceId, groupId);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Post(':id/resolve')
  async resolveAlert(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
    @Body() body: { resolutionNotes?: string; resolvedBy?: string },
  ) {
    const result = await this.alertsService.resolveAlert(
      workspaceId,
      groupId,
      body.resolutionNotes,
      body.resolvedBy,
    );
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Post(':id/snooze')
  async snoozeAlert(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
    @Query('duration') duration?: string,
  ) {
    const durationMinutes = duration ? parseInt(duration, 10) : 60;
    const result = await this.alertsService.snoozeAlert(workspaceId, groupId, durationMinutes);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Patch(':id')
  async updateAlertGroup(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
    @Body() body: { assigneeUserId?: string; runbookUrl?: string },
  ) {
    const result = await this.alertsService.updateAlertGroup(workspaceId, groupId, body);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }
}

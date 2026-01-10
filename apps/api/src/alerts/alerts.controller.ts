import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('groups')
  async listGroups(
    @CurrentUser() user: { clerkId: string },
    @Query('status') status?: string,
  ) {
    const workspaceId = await this.alertsService.getWorkspaceIdByClerkId(user.clerkId);
    if (!workspaceId) {
      throw new BadRequestException('Workspace not found');
    }
    return this.alertsService.listGroups(workspaceId, status);
  }

  @Get('groups/:id')
  async getGroup(@CurrentUser() user: { clerkId: string }, @Param('id') groupId: string) {
    const workspaceId = await this.alertsService.getWorkspaceIdByClerkId(user.clerkId);
    if (!workspaceId) {
      throw new BadRequestException('Workspace not found');
    }
    return this.alertsService.getGroup(workspaceId, groupId);
  }

  @Get('groups/:id/events')
  async listEvents(@CurrentUser() user: { clerkId: string }, @Param('id') groupId: string) {
    const workspaceId = await this.alertsService.getWorkspaceIdByClerkId(user.clerkId);
    if (!workspaceId) {
      throw new BadRequestException('Workspace not found');
    }
    return this.alertsService.listEvents(workspaceId, groupId);
  }
}

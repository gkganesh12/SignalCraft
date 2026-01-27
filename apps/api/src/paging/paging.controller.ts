import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';
import { PagingService } from './paging.service';
import { CreatePagingPolicyDto, TriggerPagingDto, UpdatePagingPolicyDto } from './dto/paging.dto';

@ApiTags('paging')
@ApiBearerAuth()
@Controller('api/paging')
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class PagingController {
  constructor(private readonly pagingService: PagingService) {}

  @Get('policies')
  @ApiOperation({ summary: 'List paging policies' })
  async listPolicies(@WorkspaceId() workspaceId: string) {
    return this.pagingService.listPolicies(workspaceId);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Get paging policy' })
  async getPolicy(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.pagingService.getPolicy(workspaceId, id);
  }

  @Post('policies')
  @ApiOperation({ summary: 'Create paging policy' })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async createPolicy(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: CreatePagingPolicyDto,
  ) {
    return this.pagingService.createPolicy(workspaceId, dto, user);
  }

  @Put('policies/:id')
  @ApiOperation({ summary: 'Update paging policy' })
  async updatePolicy(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePagingPolicyDto,
  ) {
    return this.pagingService.updatePolicy(workspaceId, id, dto, user);
  }

  @Delete('policies/:id')
  @ApiOperation({ summary: 'Delete paging policy' })
  async deletePolicy(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') id: string,
  ) {
    return this.pagingService.deletePolicy(workspaceId, id, user);
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger paging for an alert' })
  async triggerPaging(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: TriggerPagingDto,
  ) {
    return this.pagingService.triggerPaging(workspaceId, dto, user);
  }
}

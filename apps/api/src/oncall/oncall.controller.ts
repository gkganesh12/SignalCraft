import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';
import { OnCallService } from './oncall.service';
import {
  CreateLayerDto,
  CreateOverrideDto,
  CreateParticipantDto,
  CreateRotationDto,
  ListOverridesDto,
  UpdateOverrideDto,
  UpdateLayerDto,
  UpdateRotationDto,
} from './dto/oncall.dto';

@ApiTags('oncall')
@ApiBearerAuth()
@Controller('api/oncall')
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MEMBER')
export class OnCallController {
  constructor(private readonly onCallService: OnCallService) { }

  @Get('rotations')
  @ApiOperation({ summary: 'List on-call rotations' })
  async listRotations(@WorkspaceId() workspaceId: string) {
    return this.onCallService.listRotations(workspaceId);
  }

  @Post('rotations')
  @ApiOperation({ summary: 'Create an on-call rotation' })
  @ApiResponse({ status: 201, description: 'Rotation created' })
  async createRotation(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: CreateRotationDto,
  ) {
    return this.onCallService.createRotation(workspaceId, dto, user);
  }

  @Get('rotations/:id')
  @ApiOperation({ summary: 'Get rotation details' })
  async getRotation(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.onCallService.getRotation(workspaceId, id);
  }

  @Put('rotations/:id')
  @ApiOperation({ summary: 'Update rotation' })
  async updateRotation(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateRotationDto,
  ) {
    return this.onCallService.updateRotation(workspaceId, id, dto, user);
  }

  @Delete('rotations/:id')
  @ApiOperation({ summary: 'Delete rotation' })
  async deleteRotation(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') id: string,
  ) {
    return this.onCallService.deleteRotation(workspaceId, id, user);
  }

  @Post('rotations/:id/layers')
  @ApiOperation({ summary: 'Add layer to rotation' })
  async addLayer(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Body() dto: CreateLayerDto,
  ) {
    return this.onCallService.addLayer(workspaceId, rotationId, dto, user);
  }

  @Put('rotations/:id/layers/:layerId')
  @ApiOperation({ summary: 'Update rotation layer' })
  async updateLayer(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Param('layerId') layerId: string,
    @Body() dto: UpdateLayerDto,
  ) {
    return this.onCallService.updateLayer(workspaceId, rotationId, layerId, dto, user);
  }

  @Delete('rotations/:id/layers/:layerId')
  @ApiOperation({ summary: 'Delete rotation layer' })
  async deleteLayer(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Param('layerId') layerId: string,
  ) {
    return this.onCallService.deleteLayer(workspaceId, rotationId, layerId, user);
  }

  @Post('rotations/:id/layers/:layerId/participants')
  @ApiOperation({ summary: 'Add layer participant' })
  async addParticipant(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Param('layerId') layerId: string,
    @Body() dto: CreateParticipantDto,
  ) {
    return this.onCallService.addParticipant(workspaceId, rotationId, layerId, dto, user);
  }

  @Delete('rotations/:id/layers/:layerId/participants/:participantId')
  @ApiOperation({ summary: 'Remove layer participant' })
  async removeParticipant(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Param('layerId') layerId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.onCallService.removeParticipant(
      workspaceId,
      rotationId,
      layerId,
      participantId,
      user,
    );
  }

  @Post('rotations/:id/overrides')
  @ApiOperation({ summary: 'Create on-call override' })
  async addOverride(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Body() dto: CreateOverrideDto,
  ) {
    return this.onCallService.addOverride(workspaceId, rotationId, dto, user);
  }

  @Get('rotations/:id/overrides')
  @ApiOperation({ summary: 'List on-call overrides' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'userIds', required: false, type: [String] })
  async listOverrides(
    @WorkspaceId() workspaceId: string,
    @Param('id') rotationId: string,
    @Query() query: ListOverridesDto,
  ) {
    const userIdsRaw = query.userIds as unknown as string[] | string | undefined;
    const userIds = Array.isArray(userIdsRaw)
      ? userIdsRaw
      : userIdsRaw
        ? userIdsRaw.split(',')
        : undefined;

    return this.onCallService.listOverrides(workspaceId, rotationId, {
      ...query,
      userIds,
    });
  }

  @Put('rotations/:id/overrides/:overrideId')
  @ApiOperation({ summary: 'Update on-call override' })
  async updateOverride(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Param('overrideId') overrideId: string,
    @Body() dto: UpdateOverrideDto,
  ) {
    return this.onCallService.updateOverride(workspaceId, rotationId, overrideId, dto, user);
  }

  @Delete('rotations/:id/overrides/:overrideId')
  @ApiOperation({ summary: 'Remove on-call override' })
  async removeOverride(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') rotationId: string,
    @Param('overrideId') overrideId: string,
  ) {
    return this.onCallService.removeOverride(workspaceId, rotationId, overrideId, user);
  }

  @Get('who')
  @ApiOperation({ summary: 'Get current on-call for a rotation' })
  @ApiQuery({ name: 'rotationId', required: true })
  async getCurrentOnCall(
    @WorkspaceId() workspaceId: string,
    @Query('rotationId') rotationId: string,
  ) {
    return this.onCallService.getCurrentOnCall(workspaceId, rotationId);
  }

  @Get('rotations/:id/schedule')
  @ApiOperation({ summary: 'Get rotation schedule for a date range' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getSchedule(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.onCallService.getSchedule(workspaceId, id, from, to);
  }
}

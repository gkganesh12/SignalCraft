import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';
import { EscalationPoliciesService } from './escalation-policies.service';
import { CreateEscalationPolicyDto, UpdateEscalationPolicyDto } from './dto/escalation-policy.dto';

@ApiTags('escalation-policies')
@ApiBearerAuth()
@Controller('api/escalation-policies')
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MEMBER')
export class EscalationPoliciesController {
  constructor(private readonly escalationPoliciesService: EscalationPoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'List escalation policies' })
  async listPolicies(@WorkspaceId() workspaceId: string) {
    return this.escalationPoliciesService.listPolicies(workspaceId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create escalation policy' })
  async createPolicy(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: CreateEscalationPolicyDto,
  ) {
    return this.escalationPoliciesService.createPolicy(workspaceId, user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get escalation policy' })
  @ApiParam({ name: 'id', description: 'Escalation policy ID' })
  async getPolicy(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.escalationPoliciesService.getPolicy(workspaceId, id);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update escalation policy' })
  @ApiParam({ name: 'id', description: 'Escalation policy ID' })
  async updatePolicy(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEscalationPolicyDto,
  ) {
    return this.escalationPoliciesService.updatePolicy(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete escalation policy' })
  @ApiParam({ name: 'id', description: 'Escalation policy ID' })
  async deletePolicy(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.escalationPoliciesService.deletePolicy(workspaceId, id);
  }
}

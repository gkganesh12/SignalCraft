import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { ChatOpsService } from './chatops.service';

@ApiTags('ChatOps')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Controller('api/chatops')
export class ChatOpsController {
  constructor(private readonly chatOpsService: ChatOpsService) {}

  @Post('query')
  @ApiOperation({ summary: 'Query alerts using natural language' })
  @ApiResponse({ status: 200, description: 'Query results' })
  async queryAlerts(
    @WorkspaceId() workspaceId: string,
    @Body() body: { query: string; limit?: number },
  ) {
    const query = body.query?.trim();
    if (!query) {
      return { filters: {}, results: [] };
    }
    return this.chatOpsService.query(workspaceId, query, body.limit);
  }
}

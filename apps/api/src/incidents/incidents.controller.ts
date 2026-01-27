import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CollaborationService } from './collaboration.service';
import { PostmortemService } from './postmortem.service';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Controller('api/incidents')
export class IncidentsController {
    constructor(
        private readonly incidentsService: IncidentsService,
        private readonly collaborationService: CollaborationService,
        private readonly postmortemService: PostmortemService,
    ) { }

    // --- Roles ---
    @Get(':id/roles')
    @ApiOperation({ summary: 'List assigned incident roles' })
    async listRoles(@WorkspaceId() workspaceId: string, @Param('id') alertGroupId: string) {
        return this.incidentsService.listRoles(workspaceId, alertGroupId);
    }

    @Post(':id/roles')
    @ApiOperation({ summary: 'Assign incident role' })
    async assignRole(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
        @Body() body: { role: string; userId: string },
    ) {
        return this.incidentsService.assignRole(workspaceId, alertGroupId, body.role, body.userId);
    }

    @Delete(':id/roles/:role')
    @ApiOperation({ summary: 'Remove incident role' })
    async removeRole(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
        @Param('role') role: string,
    ) {
        return this.incidentsService.removeRole(workspaceId, alertGroupId, role);
    }

    // --- Collaboration ---
    @Get(':id/comments')
    @ApiOperation({ summary: 'List incident comments' })
    async listComments(@WorkspaceId() workspaceId: string, @Param('id') alertGroupId: string) {
        return this.collaborationService.listComments(workspaceId, alertGroupId);
    }

    @Post(':id/comments')
    @ApiOperation({ summary: 'Add incident comment' })
    async addComment(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
        @DbUser() user: User,
        @Body() body: { content: string; parentId?: string },
    ) {
        return this.collaborationService.addComment(workspaceId, alertGroupId, user.id, body.content, body.parentId);
    }

    @Delete('comments/:commentId')
    @ApiOperation({ summary: 'Delete incident comment' })
    async deleteComment(
        @WorkspaceId() workspaceId: string,
        @DbUser() user: User,
        @Param('commentId') commentId: string,
    ) {
        return this.collaborationService.deleteComment(workspaceId, commentId, user.id);
    }

    // --- Post-Mortems ---
    @Get(':id/postmortem')
    @ApiOperation({ summary: 'Get postmortem' })
    async getPostmortem(@WorkspaceId() workspaceId: string, @Param('id') alertGroupId: string) {
        return this.postmortemService.getPostmortem(workspaceId, alertGroupId);
    }

    @Post(':id/postmortem')
    @ApiOperation({ summary: 'Create or update postmortem' })
    async upsertPostmortem(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
        @Body() body: any,
    ) {
        return this.postmortemService.createOrUpdatePostmortem(workspaceId, alertGroupId, body);
    }

    @Post(':id/postmortem/draft')
    @ApiOperation({ summary: 'Generate AI draft for postmortem' })
    async generateDraft(@WorkspaceId() workspaceId: string, @Param('id') alertGroupId: string) {
        return this.postmortemService.generateDraft(workspaceId, alertGroupId);
    }

    @Post(':id/postmortem/action-items')
    @ApiOperation({ summary: 'Add action item to postmortem' })
    async addActionItem(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
        @Body() body: any,
    ) {
        return this.postmortemService.addActionItem(workspaceId, alertGroupId, body);
    }
}

import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../auth/clerk-auth.guard';
import { PermissionsGuard, RequirePermission, RESOURCES } from '../../permissions/permissions.guard';
import { WebhookRegistryService } from './webhook-registry.service';
import { IntegrationType } from '@signalcraft/database';
import { WorkspaceId } from '../../common/decorators/workspace-id.decorator';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, PermissionsGuard)
@Controller('api/integrations/webhooks')
export class WebhookManagementController {
    constructor(private readonly registryService: WebhookRegistryService) { }

    @Get()
    @RequirePermission(RESOURCES.INTEGRATIONS, 'READ')
    @ApiOperation({ summary: 'List all active inbound webhooks' })
    async list(@WorkspaceId() workspaceId: string) {
        return this.registryService.listByWorkspace(workspaceId);
    }

    @Post()
    @RequirePermission(RESOURCES.INTEGRATIONS, 'WRITE')
    @ApiOperation({ summary: 'Register a new inbound webhook' })
    async create(
        @WorkspaceId() workspaceId: string,
        @Body() data: { name: string; type: IntegrationType; fieldMappings?: any; severityMap?: any },
    ) {
        return this.registryService.create(workspaceId, data);
    }

    @Patch(':id')
    @RequirePermission(RESOURCES.INTEGRATIONS, 'WRITE')
    @ApiOperation({ summary: 'Update webhook configuration' })
    async update(
        @WorkspaceId() workspaceId: string,
        @Param('id') id: string,
        @Body() data: any,
    ) {
        return this.registryService.update(workspaceId, id, data);
    }

    @Delete(':id')
    @RequirePermission(RESOURCES.INTEGRATIONS, 'DELETE')
    @ApiOperation({ summary: 'Remove a webhook registration' })
    async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
        await this.registryService.delete(workspaceId, id);
        return { success: true };
    }
}

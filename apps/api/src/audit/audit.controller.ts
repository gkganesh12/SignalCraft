import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get('logs')
    @ApiOperation({ summary: 'Get audit logs' })
    async getAuditLogs(
        @WorkspaceId() workspaceId: string,
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('resourceType') resourceType?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.auditService.getAuditLogs(workspaceId, {
            userId,
            action,
            resourceType,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
    }

    @Get('export')
    @ApiOperation({ summary: 'Export audit logs as CSV' })
    async exportLogs(@WorkspaceId() workspaceId: string, @Query() filters: any) {
        const csv = await this.auditService.exportLogs(workspaceId, filters);
        return { csv };
    }
}

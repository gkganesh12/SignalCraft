import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { OpsgenieService } from './opsgenie.service';
import { prisma } from '@signalcraft/database';

class TestOpsgenieDto {
    apiKey!: string;
    region?: 'us' | 'eu';
}

class ConfigureOpsgenieDto {
    apiKey!: string;
    region?: 'us' | 'eu';
}

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/integrations/opsgenie')
export class OpsgenieController {
    constructor(private readonly opsgenieService: OpsgenieService) { }

    @Post('test')
    @ApiOperation({ summary: 'Test Opsgenie connection' })
    async testConnection(@Body() dto: TestOpsgenieDto) {
        return this.opsgenieService.testConnection(dto.apiKey, dto.region);
    }

    @Post('configure')
    @ApiOperation({ summary: 'Configure Opsgenie integration' })
    async configure(@WorkspaceId() workspaceId: string, @Body() dto: ConfigureOpsgenieDto) {
        await prisma.integration.upsert({
            where: {
                workspaceId_type: { workspaceId, type: 'OPSGENIE' as any },
            },
            create: {
                workspaceId,
                type: 'OPSGENIE' as any,
                status: 'ACTIVE',
                configJson: { apiKey: dto.apiKey, region: dto.region || 'us' },
            },
            update: {
                configJson: { apiKey: dto.apiKey, region: dto.region || 'us' },
                status: 'ACTIVE',
            },
        });
        return { success: true };
    }

    @Get('status')
    @ApiOperation({ summary: 'Get Opsgenie integration status' })
    async getStatus(@WorkspaceId() workspaceId: string) {
        const integration = await prisma.integration.findFirst({
            where: { workspaceId, type: 'OPSGENIE' as any },
        });
        return {
            configured: !!integration,
            status: integration?.status || null,
        };
    }
}

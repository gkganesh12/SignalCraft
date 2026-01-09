import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { PagerDutyService } from './pagerduty.service';
import { IntegrationsService } from './integrations.service';

class TestPagerDutyDto {
    apiKey!: string;
    serviceId!: string;
}

class ConfigurePagerDutyDto {
    apiKey!: string;
    serviceId!: string;
}

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/integrations/pagerduty')
export class PagerDutyController {
    constructor(
        private readonly pagerdutyService: PagerDutyService,
        private readonly integrationsService: IntegrationsService,
    ) { }

    @Post('test')
    @ApiOperation({ summary: 'Test PagerDuty connection' })
    async testConnection(@Body() dto: TestPagerDutyDto) {
        return this.pagerdutyService.testConnection(dto.apiKey, dto.serviceId);
    }

    @Get('services')
    @ApiOperation({ summary: 'Get PagerDuty services' })
    async getServices(@Query('apiKey') apiKey: string) {
        const services = await this.pagerdutyService.getServices(apiKey);
        return { services };
    }

    @Post('configure')
    @ApiOperation({ summary: 'Configure PagerDuty integration' })
    async configure(@WorkspaceId() workspaceId: string, @Body() dto: ConfigurePagerDutyDto) {
        // Save configuration to Integration table
        await this.integrationsService.upsertIntegration({
            workspaceId,
            type: 'PAGERDUTY' as any, // Will need enum update
            config: {
                apiKey: dto.apiKey,
                serviceId: dto.serviceId,
            },
            status: 'ACTIVE' as any,
        });

        return { success: true };
    }

    @Get('status')
    @ApiOperation({ summary: 'Get PagerDuty integration status' })
    async getStatus(@WorkspaceId() workspaceId: string) {
        const integration = await this.integrationsService.getIntegration(workspaceId, 'PAGERDUTY' as any);
        return {
            configured: !!integration,
            status: integration?.status || null,
        };
    }
}

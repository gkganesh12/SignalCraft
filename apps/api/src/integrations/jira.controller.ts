import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { IntegrationsService } from './integrations.service';
import { JiraService } from './jira.service';

class ConfigureJiraDto {
  baseUrl?: string;
  email?: string;
  apiToken?: string;
  projectKey?: string;
  issueType?: string;
  autoCreateCritical?: boolean;
  webhookToken?: string;
}

class TestJiraDto {
  baseUrl!: string;
  email!: string;
  apiToken!: string;
}

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard)
@Controller('api/integrations/jira')
export class JiraController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly jiraService: JiraService,
  ) {}

  @Post('configure')
  @ApiOperation({ summary: 'Configure Jira integration' })
  async configure(@WorkspaceId() workspaceId: string, @Body() dto: ConfigureJiraDto) {
    const existing = await this.integrationsService.getIntegration(workspaceId, 'JIRA' as any);
    const existingConfig = (existing?.configJson ?? {}) as Record<string, unknown>;
    const nextConfig = {
      ...existingConfig,
      ...(dto.baseUrl !== undefined ? { baseUrl: dto.baseUrl } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.apiToken !== undefined ? { apiToken: dto.apiToken } : {}),
      ...(dto.projectKey !== undefined ? { projectKey: dto.projectKey } : {}),
      ...(dto.issueType !== undefined ? { issueType: dto.issueType } : {}),
      ...(dto.autoCreateCritical !== undefined
        ? { autoCreateCritical: dto.autoCreateCritical }
        : {}),
      ...(dto.webhookToken !== undefined ? { webhookToken: dto.webhookToken } : {}),
    };

    await this.integrationsService.upsertIntegration(workspaceId, 'JIRA' as any, nextConfig);

    return { success: true };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test Jira connection' })
  async test(@Body() dto: TestJiraDto) {
    return this.jiraService.testConnection({
      baseUrl: dto.baseUrl,
      email: dto.email,
      apiToken: dto.apiToken,
      projectKey: 'TEST',
      issueType: 'Task',
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Jira integration status' })
  async status(@WorkspaceId() workspaceId: string) {
    const integration = await this.integrationsService.getIntegration(workspaceId, 'JIRA' as any);
    if (!integration) {
      return { configured: false };
    }

    const config = integration.configJson as Record<string, unknown>;
    const oauth = config.oauth as Record<string, unknown> | undefined;

    return {
      configured: true,
      status: integration.status,
      baseUrl: config.baseUrl ?? null,
      projectKey: config.projectKey ?? null,
      issueType: config.issueType ?? null,
      autoCreateCritical: config.autoCreateCritical ?? false,
      webhookTokenConfigured: Boolean(config.webhookToken),
      oauthConnected: Boolean(oauth?.accessToken),
    };
  }
}

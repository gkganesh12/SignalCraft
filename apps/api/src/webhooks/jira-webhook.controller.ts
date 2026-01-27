import { Body, Controller, Headers, Logger, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlertsService } from '../alerts/alerts.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { AuthenticationException, ValidationException } from '../common/exceptions/base.exception';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class JiraWebhookController {
  private readonly logger = new Logger(JiraWebhookController.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Post('jira')
  @ApiOperation({
    summary: 'Ingest Jira webhook',
    description: 'Sync Jira issue status updates into SignalCraft.',
  })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'token', required: false })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleJiraWebhook(
    @Body() payload: Record<string, any>,
    @Query('workspaceId') workspaceId: string,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-jira-token') tokenHeader: string | undefined,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    const token = tokenQuery ?? tokenHeader;
    const integration = await this.integrationsService.getIntegration(workspaceId, 'JIRA' as any);
    const config = (integration?.configJson ?? {}) as Record<string, unknown>;
    const expectedToken = config.webhookToken as string | undefined;

    if (expectedToken && token !== expectedToken) {
      throw new AuthenticationException('Invalid Jira webhook token');
    }

    const issue = payload.issue ?? {};
    const issueKey = issue.key ?? 'unknown';
    const statusCategory = issue.fields?.status?.statusCategory?.key ?? '';
    const statusName = issue.fields?.status?.name ?? '';

    const isResolved =
      String(statusCategory).toLowerCase() === 'done' ||
      ['done', 'closed', 'resolved'].includes(String(statusName).toLowerCase());

    if (!isResolved) {
      return { status: 'ignored', reason: 'not_resolved' };
    }

    const labels = issue.fields?.labels ?? [];
    const labelMatch = Array.isArray(labels)
      ? labels.find((label: string) => label.startsWith('signalcraft-alert-'))
      : null;
    const alertGroupId = labelMatch ? labelMatch.replace('signalcraft-alert-', '') : null;

    if (!alertGroupId) {
      this.logger.warn('Jira webhook missing SignalCraft alert label', { issueKey });
      return { status: 'ignored', reason: 'missing_alert_label' };
    }

    const result = await this.alertsService.resolveAlert(
      workspaceId,
      alertGroupId,
      `Resolved via Jira ${issueKey}`,
    );

    if (!result) {
      return { status: 'ignored', reason: 'alert_not_found' };
    }

    return { status: 'ok', alertGroupId, issueKey };
  }
}

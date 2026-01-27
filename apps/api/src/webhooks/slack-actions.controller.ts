import { Body, Controller, Headers, Logger, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import crypto from 'crypto';
import { prisma } from '@signalcraft/database';
import { SecretsService } from '../common/secrets/secrets.service';
import {
  ValidationException,
  AuthenticationException,
  ConfigurationException,
} from '../common/exceptions/base.exception';
import { AlertsService } from '../alerts/alerts.service';

@ApiTags('webhooks')
@Controller('webhooks/slack')
export class SlackActionsController {
  private readonly logger = new Logger(SlackActionsController.name);

  constructor(
    private readonly secretsService: SecretsService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Handle interactive actions from Slack (buttons, menus, etc.)
   */
  @Post('actions')
  async handleSlackAction(
    @Req() req: { body: Buffer },
    @Body() body: { payload?: string },
    @Headers('x-slack-signature') signature: string | undefined,
    @Headers('x-slack-request-timestamp') timestamp: string | undefined,
  ) {
    const rawBody = req.body?.toString('utf8') ?? '';

    // ✅ SECURE: Verify Slack signature using secret from AWS Secrets Manager
    await this.verifySlackSignature(rawBody, timestamp, signature);

    if (!body.payload) {
      throw new ValidationException('Missing Slack payload');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body.payload);
    } catch {
      throw new ValidationException('Invalid JSON in Slack payload');
    }

    this.logger.log(`Slack action received`, {
      type: (payload as Record<string, unknown>)?.type,
    });

    const actionPayload = payload as Record<string, unknown>;
    const actions = Array.isArray(actionPayload.actions) ? actionPayload.actions : [];
    const action = actions[0] as Record<string, unknown> | undefined;

    if (!action) {
      throw new ValidationException('Missing Slack action');
    }

    const actionId = String(
      action.action_id || action.actionId || action.id || action.value || '',
    ).trim();
    const alertGroupId = String(action.value || actionPayload.callback_id || '').trim();

    if (!alertGroupId) {
      throw new ValidationException('Missing alert group reference');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId },
      select: { id: true, workspaceId: true },
    });

    if (!group) {
      throw new ValidationException('Unknown alert group');
    }

    switch (actionId) {
      case 'ack':
        await this.alertsService.acknowledgeAlert(group.workspaceId, group.id, undefined, 'slack');
        return { text: 'Alert acknowledged.' };
      case 'resolve':
        await this.alertsService.resolveAlert(
          group.workspaceId,
          group.id,
          undefined,
          undefined,
          'slack',
        );
        return { text: 'Alert resolved.' };
      case 'snooze':
        await this.alertsService.snoozeAlert(group.workspaceId, group.id, 60);
        return { text: 'Alert snoozed for 60 minutes.' };
      default:
        this.logger.warn('Slack action not supported', { actionId });
        return { status: 'ignored', message: 'Unsupported Slack action' };
    }
  }

  private async verifySlackSignature(rawBody: string, timestamp?: string, signature?: string) {
    let secret: string;
    try {
      // ✅ RETRIEVE FROM SECRETS MANAGER (Global secret for Slack)
      secret = await this.secretsService.getSecret('signalcraft/global/slack-signing-secret');
    } catch (error) {
      // Fallback to env during migration
      secret = process.env.SLACK_SIGNING_SECRET ?? '';
      if (!secret) {
        throw new ConfigurationException(
          'Slack signing secret not configured',
          'SLACK_SIGNING_SECRET',
        );
      }
      this.logger.warn('Slack signing secret not found in Secrets Manager, using fallback');
    }

    if (!signature || !timestamp) {
      throw new AuthenticationException('Missing Slack signature or timestamp');
    }

    // Prevent replay attacks (5 minute window)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (parseInt(timestamp, 10) < fiveMinutesAgo) {
      throw new AuthenticationException('Slack request too old (replay attack prevention)');
    }

    const sigBaseString = `v0:${timestamp}:${rawBody}`;
    const mySignature = `v0=${crypto
      .createHmac('sha256', secret)
      .update(sigBaseString)
      .digest('hex')}`;

    const mySignatureBuffer = Buffer.from(mySignature);
    const slackSignatureBuffer = Buffer.from(signature);

    if (
      mySignatureBuffer.length !== slackSignatureBuffer.length ||
      !crypto.timingSafeEqual(mySignatureBuffer, slackSignatureBuffer)
    ) {
      throw new AuthenticationException('Invalid Slack signature');
    }
  }
}

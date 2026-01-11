import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import crypto from 'crypto';
import querystring from 'querystring';
import { prisma, AlertStatus } from '@signalcraft/database';
import { SlackNotificationService } from '../notifications/slack-notification.service';

@ApiTags('webhooks')
@Controller('webhooks/slack')
export class SlackActionsController {
  constructor(private readonly slackNotifications: SlackNotificationService) {}

  @Post('actions')
  async handleAction(
    @Req() req: { body: Buffer },
    @Headers('x-slack-signature') signature: string | undefined,
    @Headers('x-slack-request-timestamp') timestamp: string | undefined,
  ) {
    const rawBody = req.body?.toString('utf8') ?? '';
    this.verifySlackSignature(rawBody, signature, timestamp);

    const parsed = querystring.parse(rawBody);
    const payload = parsed.payload ? JSON.parse(String(parsed.payload)) : null;

    if (!payload || !payload.actions?.length) {
      throw new BadRequestException('Missing Slack action payload');
    }

    const action = payload.actions[0];
    const groupId = action.value as string;

    if (!groupId) {
      throw new BadRequestException('Missing group id');
    }

    let status: AlertStatus | null = null;
    if (action.action_id === 'ack') {
      status = AlertStatus.ACK;
    } else if (action.action_id === 'snooze') {
      status = AlertStatus.SNOOZED;
    } else if (action.action_id === 'resolve') {
      status = AlertStatus.RESOLVED;
    }

    if (!status) {
      throw new BadRequestException('Unknown action');
    }

    const group = await prisma.alertGroup.update({
      where: { id: groupId },
      data: { status },
    });

    const channelId = payload.channel?.id as string | undefined;
    const messageTs = payload.message?.ts as string | undefined;
    if (channelId && messageTs) {
      await this.slackNotifications.updateMessage(group.workspaceId, channelId, messageTs, groupId);
    }

    return { status: 'ok' };
  }

  private verifySlackSignature(
    rawBody: string,
    signature?: string,
    timestamp?: string,
  ) {
    const secret = process.env.SLACK_SIGNING_SECRET;
    if (!secret) {
      return;
    }
    if (!signature || !timestamp) {
      throw new BadRequestException('Missing Slack signature');
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 60 * 5) {
      throw new BadRequestException('Stale Slack request');
    }

    const base = `v0:${timestamp}:${rawBody}`;
    const digest = `v0=${crypto.createHmac('sha256', secret).update(base).digest('hex')}`;

    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature);
    if (digestBuffer.length !== signatureBuffer.length) {
      throw new BadRequestException('Invalid Slack signature');
    }
    const valid = crypto.timingSafeEqual(digestBuffer, signatureBuffer);
    if (!valid) {
      throw new BadRequestException('Invalid Slack signature');
    }
  }
}

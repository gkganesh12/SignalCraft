import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { prisma, AlertStatus } from '@signalcraft/database';
import { SlackOAuthService } from '../integrations/slack/oauth.service';
import { SlackService } from '../integrations/slack/slack.service';

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);

  constructor(
    private readonly slackOAuth: SlackOAuthService,
    private readonly slackService: SlackService,
  ) {}

  async sendAlert(workspaceId: string, alertGroupId: string) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new Error('Slack not connected');
    }

    const channelId = await this.slackService.getDefaultChannel(workspaceId);
    if (!channelId) {
      throw new Error('Default Slack channel not configured');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new Error('Alert group not found');
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group);
    const response = await client.chat.postMessage({
      channel: channelId,
      text: group.title,
      blocks,
    });

    return { channelId, ts: response.ts };
  }

  async updateMessage(
    workspaceId: string,
    channelId: string,
    ts: string,
    alertGroupId: string,
  ) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new Error('Slack not connected');
    }
    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new Error('Alert group not found');
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group, true);
    await client.chat.update({
      channel: channelId,
      ts,
      text: group.title,
      blocks,
    });
  }

  private buildBlocks(group: { id: string; title: string; severity: string; environment: string; count: number; status: AlertStatus }, disableActions = false) {
    const severityEmoji = this.mapSeverity(group.severity);
    const statusLabel = group.status.toLowerCase();
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${severityEmoji} *${group.title}*`,
        },
        fields: [
          { type: 'mrkdwn', text: `*Env:* ${group.environment}` },
          { type: 'mrkdwn', text: `*Count:* ${group.count}` },
          { type: 'mrkdwn', text: `*Status:* ${statusLabel}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Acknowledge' },
            style: 'primary',
            action_id: 'ack',
            value: group.id,
            ...(disableActions ? { disabled: true } : {}),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Snooze 1h' },
            action_id: 'snooze',
            value: group.id,
            ...(disableActions ? { disabled: true } : {}),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Resolve' },
            style: 'danger',
            action_id: 'resolve',
            value: group.id,
            ...(disableActions ? { disabled: true } : {}),
          },
        ],
      },
    ];
  }

  private mapSeverity(severity: string) {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🔵';
      default:
        return '⚪';
    }
  }
}

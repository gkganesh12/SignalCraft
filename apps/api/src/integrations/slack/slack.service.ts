import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { prisma } from '@signalcraft/database';
import { SlackOAuthService } from './oauth.service';

@Injectable()
export class SlackService {
  constructor(private readonly slackOAuth: SlackOAuthService) {}

  async listChannels(workspaceId: string) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      return [];
    }
    const client = new WebClient(token);
    const response = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 200,
    });

    return (
      response.channels?.map((channel) => ({
        id: channel.id,
        name: channel.name,
      })) ?? []
    );
  }

  async getDefaultChannel(workspaceId: string): Promise<string | null> {
    const configured = process.env.SLACK_DEFAULT_CHANNEL;
    if (configured) {
      return configured;
    }
    const integration = await this.slackOAuth.getIntegration(workspaceId);
    const stored = (integration?.configJson as { defaultChannel?: string })?.defaultChannel;
    return stored ?? null;
  }

  async updateDefaultChannel(workspaceId: string, channelId: string) {
    const integration = await this.slackOAuth.getIntegration(workspaceId);
    if (!integration) {
      return null;
    }
    return prisma.integration.update({
      where: { id: integration.id },
      data: {
        configJson: {
          ...(integration.configJson as Record<string, unknown>),
          defaultChannel: channelId,
        },
      },
    });
  }
}

import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SlackOAuthService } from './slack/oauth.service';
import { SlackService } from './slack/slack.service';
import { prisma } from '@signalcraft/database';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly slackOAuth: SlackOAuthService,
    private readonly slackService: SlackService,
  ) {}

  @Get('slack/status')
  async slackStatus(@CurrentUser() user: { clerkId: string }) {
    const workspaceId = await this.getWorkspaceId(user.clerkId);
    const integration = await this.slackOAuth.getIntegration(workspaceId);
    if (!integration) {
      return { connected: false };
    }
    const config = integration.configJson as Record<string, unknown>;
    return {
      connected: integration.status === 'ACTIVE',
      teamName: config.teamName ?? null,
      defaultChannel: config.defaultChannel ?? null,
    };
  }

  @Post('slack/install')
  async slackInstall(
    @CurrentUser() user: { clerkId: string },
    @Body() payload: { code: string },
  ) {
    const workspaceId = await this.getWorkspaceId(user.clerkId);
    if (!payload.code) {
      throw new BadRequestException('Missing Slack code');
    }
    const oauth = await this.slackOAuth.exchangeCode(payload.code);
    await this.slackOAuth.upsertIntegration(workspaceId, oauth);
    return { status: 'ok' };
  }

  @Post('slack/disconnect')
  async slackDisconnect(@CurrentUser() user: { clerkId: string }) {
    const workspaceId = await this.getWorkspaceId(user.clerkId);
    await this.slackOAuth.disconnect(workspaceId);
    return { status: 'ok' };
  }

  @Get('slack/channels')
  async slackChannels(@CurrentUser() user: { clerkId: string }) {
    const workspaceId = await this.getWorkspaceId(user.clerkId);
    return this.slackService.listChannels(workspaceId);
  }

  @Post('slack/default-channel')
  async setDefaultChannel(
    @CurrentUser() user: { clerkId: string },
    @Body() payload: { channelId: string },
  ) {
    const workspaceId = await this.getWorkspaceId(user.clerkId);
    if (!payload.channelId) {
      throw new BadRequestException('Missing channelId');
    }
    await this.slackService.updateDefaultChannel(workspaceId, payload.channelId);
    return { status: 'ok' };
  }

  private async getWorkspaceId(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      throw new BadRequestException('Workspace not found');
    }
    return user.workspaceId;
  }
}

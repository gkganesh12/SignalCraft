import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { ValidationException } from '../common/exceptions/base.exception';
import { JiraService } from './jira.service';

class JiraOAuthStartDto {
  returnUrl?: string;
}

@ApiTags('integrations')
@Controller('api/integrations/jira/oauth')
export class JiraOAuthController {
  constructor(private readonly jiraService: JiraService) {}

  @Post('start')
  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard)
  @ApiOperation({ summary: 'Start Jira OAuth flow' })
  async start(@WorkspaceId() workspaceId: string, @Body() body: JiraOAuthStartDto) {
    const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const returnUrl = body.returnUrl ?? `${baseUrl}/dashboard/integrations?jira=connected`;
    const url = await this.jiraService.getOAuthAuthorizationUrl(workspaceId, returnUrl);
    return { url };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle Jira OAuth callback' })
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) {
      throw new ValidationException('Missing Jira OAuth code or state');
    }

    const { returnUrl } = await this.jiraService.handleOAuthCallback(code, state);
    return res.redirect(returnUrl || '/dashboard/integrations?jira=connected');
  }
}

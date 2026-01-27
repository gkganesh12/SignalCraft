import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import axios from 'axios';
import crypto from 'crypto';
import { ConfigurationException, ValidationException } from '../common/exceptions/base.exception';

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
  autoCreateCritical?: boolean;
  webhookToken?: string;
  oauth?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    cloudId?: string;
    apiBaseUrl?: string;
    siteUrl?: string;
  };
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  async getConfig(workspaceId: string): Promise<JiraConfig | null> {
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        type: 'JIRA' as any,
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      return null;
    }

    return integration.configJson as unknown as JiraConfig;
  }

  async testConnection(config: JiraConfig): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.get(`${config.baseUrl}/rest/api/2/myself`, {
        headers: {
          Authorization: this.buildAuthHeader(config),
          Accept: 'application/json',
        },
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.errorMessages?.[0] || error.message };
    }
  }

  async createIssueForAlert(
    workspaceId: string,
    alertGroupId: string,
  ): Promise<{ success: boolean; issueKey?: string; issueUrl?: string; error?: string }> {
    try {
      const config = await this.getConfig(workspaceId);
      if (!config) {
        return { success: false, error: 'Jira not configured' };
      }

      if (!config.oauth?.accessToken && (!config.baseUrl || !config.email || !config.apiToken)) {
        return { success: false, error: 'Jira API credentials missing' };
      }

      if (!config.projectKey || !config.issueType) {
        return { success: false, error: 'Jira project key or issue type missing' };
      }

      const alert = await prisma.alertGroup.findFirst({
        where: { id: alertGroupId, workspaceId },
      });

      if (!alert) {
        return { success: false, error: 'Alert not found' };
      }

      if (alert.jiraIssueKey && alert.jiraIssueUrl) {
        return { success: true, issueKey: alert.jiraIssueKey, issueUrl: alert.jiraIssueUrl };
      }

      const labels = ['signalcraft', `signalcraft-alert-${alert.id}`];
      const description = [
        `SignalCraft Alert ID: ${alert.id}`,
        `Title: ${alert.title}`,
        `Severity: ${alert.severity}`,
        `Environment: ${alert.environment}`,
        `Project: ${alert.project}`,
        `Status: ${alert.status}`,
      ].join('\n');

      const { apiBaseUrl, headers } = await this.getApiRequestConfig(workspaceId, config);

      const response = await axios.post(
        `${apiBaseUrl}/rest/api/2/issue`,
        {
          fields: {
            project: { key: config.projectKey },
            summary: `[SignalCraft] ${alert.title}`,
            description,
            issuetype: { name: config.issueType },
            labels,
          },
        },
        {
          headers,
        },
      );

      const issueKey = response.data.key;
      const issueUrl = this.buildIssueUrl(config, issueKey);

      await prisma.alertGroup.update({
        where: { id: alert.id },
        data: {
          jiraIssueKey: issueKey,
          jiraIssueUrl: issueUrl,
        },
      });

      this.logger.log(`Jira issue created: ${issueKey} for alert ${alert.id}`);

      return { success: true, issueKey, issueUrl };
    } catch (error: any) {
      this.logger.error('Failed to create Jira issue:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async shouldAutoCreate(workspaceId: string): Promise<boolean> {
    const config = await this.getConfig(workspaceId);
    return Boolean(config?.autoCreateCritical);
  }

  async getOAuthAuthorizationUrl(workspaceId: string, returnUrl: string): Promise<string> {
    const clientId = process.env.JIRA_CLIENT_ID;
    const redirectUri = process.env.JIRA_REDIRECT_URI;
    const stateSecret = process.env.JIRA_OAUTH_STATE_SECRET;

    if (!clientId || !redirectUri || !stateSecret) {
      throw new ConfigurationException('Jira OAuth is not configured');
    }

    const state = this.signState({ workspaceId, returnUrl });
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: clientId,
      scope: ['read:jira-user', 'read:jira-work', 'write:jira-work', 'offline_access'].join(' '),
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, state: string) {
    const { workspaceId, returnUrl } = this.verifyState(state);

    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const redirectUri = process.env.JIRA_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new ConfigurationException('Jira OAuth is not configured');
    }

    const tokenResponse = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const resourcesResponse = await axios.get(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json',
        },
      },
    );

    const resources = resourcesResponse.data as Array<{ id: string; url: string; name: string }>;
    const resource = resources[0];
    if (!resource) {
      throw new ValidationException('No Jira resources accessible for this account');
    }

    const oauthConfig = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
      cloudId: resource.id,
      apiBaseUrl: `https://api.atlassian.com/ex/jira/${resource.id}`,
      siteUrl: resource.url,
    };

    await this.upsertConfig(workspaceId, { oauth: oauthConfig, baseUrl: resource.url });

    return { workspaceId, returnUrl };
  }

  async transitionIssue(workspaceId: string, issueKey: string, targetStatuses: string[]) {
    const config = await this.getConfig(workspaceId);
    if (!config) {
      throw new ConfigurationException('Jira not configured');
    }

    const { apiBaseUrl, headers } = await this.getApiRequestConfig(workspaceId, config);
    const transitions = await axios.get(`${apiBaseUrl}/rest/api/2/issue/${issueKey}/transitions`, {
      headers,
    });

    const candidates: Array<{ id: string; name: string }> = transitions.data?.transitions ?? [];
    const target = candidates.find((transition) =>
      targetStatuses.some((status) => transition.name.toLowerCase() === status.toLowerCase()),
    );

    if (!target) {
      this.logger.warn('Jira transition not found', { issueKey, targetStatuses });
      return;
    }

    await axios.post(
      `${apiBaseUrl}/rest/api/2/issue/${issueKey}/transitions`,
      {
        transition: { id: target.id },
      },
      { headers },
    );
  }

  private buildAuthHeader(config: JiraConfig): string {
    const token = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    return `Basic ${token}`;
  }

  private async getApiRequestConfig(workspaceId: string, config: JiraConfig) {
    if (config.oauth?.accessToken) {
      const accessToken = await this.ensureAccessToken(workspaceId, config);
      return {
        apiBaseUrl: config.oauth?.apiBaseUrl ?? config.baseUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };
    }

    return {
      apiBaseUrl: config.baseUrl,
      headers: {
        Authorization: this.buildAuthHeader(config),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
  }

  private buildIssueUrl(config: JiraConfig, issueKey: string) {
    const baseUrl = config.oauth?.siteUrl ?? config.baseUrl;
    return `${baseUrl}/browse/${issueKey}`;
  }

  private async ensureAccessToken(workspaceId: string, config: JiraConfig): Promise<string> {
    if (!config.oauth) {
      throw new ConfigurationException('Jira OAuth not configured');
    }

    const { accessToken, refreshToken, expiresAt } = config.oauth;
    if (!expiresAt || new Date(expiresAt).getTime() > Date.now() + 60_000) {
      return accessToken;
    }

    if (!refreshToken) {
      return accessToken;
    }

    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new ConfigurationException('Jira OAuth is not configured');
    }

    const response = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const nextAccessToken = response.data.access_token;
    const nextRefreshToken = response.data.refresh_token ?? refreshToken;
    const nextExpiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();

    await this.upsertConfig(workspaceId, {
      oauth: {
        ...config.oauth,
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        expiresAt: nextExpiresAt,
      },
    });

    return nextAccessToken;
  }

  private async upsertConfig(workspaceId: string, patch: Partial<JiraConfig>) {
    const existing = await prisma.integration.findFirst({
      where: { workspaceId, type: 'JIRA' as any },
    });

    const nextConfig = {
      ...(existing?.configJson as Record<string, unknown> | undefined),
      ...patch,
    } as JiraConfig;

    await prisma.integration.upsert({
      where: { workspaceId_type: { workspaceId, type: 'JIRA' as any } },
      create: {
        workspaceId,
        type: 'JIRA' as any,
        status: 'ACTIVE',
        configJson: nextConfig as any,
      },
      update: {
        status: 'ACTIVE',
        configJson: nextConfig as any,
      },
    });
  }

  private signState(payload: { workspaceId: string; returnUrl: string }) {
    const secret = process.env.JIRA_OAUTH_STATE_SECRET;
    if (!secret) {
      throw new ConfigurationException('Jira OAuth state secret missing');
    }
    const body = {
      ...payload,
      nonce: crypto.randomBytes(8).toString('hex'),
      issuedAt: Date.now(),
    };
    const bodyEncoded = Buffer.from(JSON.stringify(body)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(bodyEncoded).digest('base64url');
    return `${bodyEncoded}.${signature}`;
  }

  private verifyState(state: string) {
    const secret = process.env.JIRA_OAUTH_STATE_SECRET;
    if (!secret) {
      throw new ConfigurationException('Jira OAuth state secret missing');
    }
    const [bodyEncoded, signature] = state.split('.');
    if (!bodyEncoded || !signature) {
      throw new ValidationException('Invalid OAuth state');
    }
    const expected = crypto.createHmac('sha256', secret).update(bodyEncoded).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new ValidationException('Invalid OAuth state signature');
    }
    const payload = JSON.parse(Buffer.from(bodyEncoded, 'base64url').toString('utf-8')) as {
      workspaceId: string;
      returnUrl: string;
    };
    if (!payload.workspaceId) {
      throw new ValidationException('Invalid OAuth state payload');
    }
    return payload;
  }
}

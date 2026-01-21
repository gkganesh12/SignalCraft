import { Test, TestingModule } from '@nestjs/testing';
import { SlackNotificationService } from './slack-notification.service';
import { SlackOAuthService } from '../integrations/slack/oauth.service';
import { SlackService } from '../integrations/slack/slack.service';
import { prisma, AlertStatus } from '@signalcraft/database';
import { Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';

// Mock Dependencies
jest.mock('@signalcraft/database', () => ({
    prisma: {
        alertGroup: { findFirst: jest.fn() },
    },
    AlertStatus: { OPEN: 'OPEN' },
}));
jest.mock('@slack/web-api');

// Mock Logger
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });

describe('SlackNotificationService', () => {
    let service: SlackNotificationService;
    let slackOAuth: SlackOAuthService;
    let slackService: SlackService;
    let mockPostMessage: jest.Mock;

    const mockSlackOAuth = { getDecryptedToken: jest.fn() };
    const mockSlackService = { getDefaultChannel: jest.fn() };

    beforeEach(async () => {
        mockPostMessage = jest.fn().mockResolvedValue({ ts: '1234.5678' });
        (WebClient as unknown as jest.Mock).mockImplementation(() => ({
            chat: {
                postMessage: mockPostMessage,
                update: jest.fn(),
            },
        }));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SlackNotificationService,
                { provide: SlackOAuthService, useValue: mockSlackOAuth },
                { provide: SlackService, useValue: mockSlackService },
            ],
        }).compile();

        service = module.get<SlackNotificationService>(SlackNotificationService);
        slackOAuth = module.get<SlackOAuthService>(SlackOAuthService);
        slackService = module.get<SlackService>(SlackService);

        jest.clearAllMocks();
    });

    describe('sendAlert', () => {
        it('should send alert if connected and group exists', async () => {
            mockSlackOAuth.getDecryptedToken.mockResolvedValue('token-123');
            mockSlackService.getDefaultChannel.mockResolvedValue('C123');

            const mockGroup = {
                id: 'group-1',
                title: 'Critical Error',
                severity: 'CRITICAL',
                environment: 'production',
                count: 1,
                status: AlertStatus.OPEN,
            };
            (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(mockGroup);

            await service.sendAlert('ws-1', 'group-1');

            expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
                channel: 'C123',
                text: 'Critical Error',
                blocks: expect.any(Array),
            }));
        });

        it('should throw Error if Slack not connected', async () => {
            mockSlackOAuth.getDecryptedToken.mockResolvedValue(null);
            await expect(service.sendAlert('ws-1', 'group-1')).rejects.toThrow('Slack not connected');
        });

        it('should throw Error if default channel not set', async () => {
            mockSlackOAuth.getDecryptedToken.mockResolvedValue('token');
            mockSlackService.getDefaultChannel.mockResolvedValue(null);
            await expect(service.sendAlert('ws-1', 'group-1')).rejects.toThrow('Default Slack channel not configured');
        });
    });
});

import { ChatOpsService } from './chatops.service';
import { AiService } from '../ai/ai.service';
import { prisma, AlertSeverity, AlertStatus } from '@signalcraft/database';

jest.mock('@signalcraft/database', () => ({
  prisma: {
    alertGroup: {
      findMany: jest.fn(),
    },
  },
  AlertStatus: {
    OPEN: 'OPEN',
    ACK: 'ACK',
    SNOOZED: 'SNOOZED',
    RESOLVED: 'RESOLVED',
  },
  AlertSeverity: {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    INFO: 'INFO',
  },
}));

describe('ChatOpsService', () => {
  let service: ChatOpsService;
  let aiService: jest.Mocked<AiService>;

  beforeEach(() => {
    aiService = {
      isEnabled: jest.fn(),
      generateContent: jest.fn(),
    } as unknown as jest.Mocked<AiService>;

    (prisma.alertGroup.findMany as jest.Mock).mockResolvedValue([]);
    service = new ChatOpsService(aiService);
    jest.clearAllMocks();
  });

  it('uses AI filters when available', async () => {
    aiService.isEnabled.mockReturnValue(true);
    aiService.generateContent.mockResolvedValue(
      JSON.stringify({
        statuses: ['open'],
        severities: ['high'],
        project: 'payments',
        environment: 'production',
        since: '2026-01-25T00:00:00Z',
        until: null,
        keywords: ['latency'],
        limit: 5,
      }),
    );

    const result = await service.query(
      'ws-1',
      'Show me high latency alerts from the last 24h related to payments in production',
      20,
    );

    expect(prisma.alertGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'ws-1',
          project: 'payments',
          environment: 'production',
          status: { in: [AlertStatus.OPEN] },
          severity: { in: [AlertSeverity.HIGH] },
          lastSeenAt: expect.objectContaining({ gte: expect.any(Date) }),
          OR: expect.arrayContaining([
            { title: { contains: 'latency', mode: 'insensitive' } },
          ]),
        }),
        take: 5,
      }),
    );
    expect(result.filters.source).toBe('ai');
  });

  it('falls back to heuristics when AI output is invalid', async () => {
    aiService.isEnabled.mockReturnValue(true);
    aiService.generateContent.mockResolvedValue('not json');

    const result = await service.query('ws-1', 'open critical payments prod last 24h', 10);

    expect(prisma.alertGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          environment: 'production',
          status: { in: [AlertStatus.OPEN] },
          severity: { in: [AlertSeverity.CRITICAL] },
        }),
        take: 10,
      }),
    );
    expect(result.filters.source).toBe('heuristic');
  });
});

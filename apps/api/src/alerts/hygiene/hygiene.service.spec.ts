import { Test, TestingModule } from '@nestjs/testing';
import { HygieneService } from './hygiene.service';
import { EscalationService } from '../../escalations/escalation.service';
import { prisma, AlertStatus } from '@signalcraft/database';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';

// Mock Prisma
jest.mock('@signalcraft/database', () => ({
    prisma: {
        alertGroup: {
            findFirst: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
    AlertStatus: {
        OPEN: 'OPEN',
        RESOLVED: 'RESOLVED',
        SNOOZED: 'SNOOZED',
        ACK: 'ACK',
    },
}));

// Mock Logger
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });

describe('HygieneService', () => {
    let service: HygieneService;
    let escalationService: EscalationService;

    const mockEscalationService = {
        cancelEscalation: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HygieneService,
                {
                    provide: EscalationService,
                    useValue: mockEscalationService,
                },
            ],
        }).compile();

        service = module.get<HygieneService>(HygieneService);
        escalationService = module.get<EscalationService>(EscalationService);

        jest.clearAllMocks();
    });

    describe('snoozeAlertGroup', () => {
        it('should snooze an open alert group', async () => {
            const mockGroup = {
                id: 'group-1',
                workspaceId: 'ws-1',
                status: AlertStatus.OPEN,
                assigneeUserId: null,
            };

            (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(mockGroup);
            (prisma.alertGroup.update as jest.Mock).mockResolvedValue({
                ...mockGroup,
                status: AlertStatus.SNOOZED,
                snoozeUntil: new Date(),
            });

            const result = await service.snoozeAlertGroup('ws-1', 'group-1', { durationHours: 1 });

            expect(prisma.alertGroup.findFirst).toHaveBeenCalledWith({ where: { id: 'group-1', workspaceId: 'ws-1' } });
            expect(prisma.alertGroup.update).toHaveBeenCalled();
            expect(mockEscalationService.cancelEscalation).toHaveBeenCalledWith('group-1');
            expect(result.status).toBe(AlertStatus.SNOOZED);
        });

        it('should throw NotFoundException if group not found', async () => {
            (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(service.snoozeAlertGroup('ws-1', 'group-1', { durationHours: 1 }))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if alert is resolved', async () => {
            const mockGroup = {
                id: 'group-1',
                workspaceId: 'ws-1',
                status: AlertStatus.RESOLVED,
            };

            (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(mockGroup);

            await expect(service.snoozeAlertGroup('ws-1', 'group-1', { durationHours: 1 }))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('resolveAlertGroup', () => {
        it('should resolve an alert group', async () => {
            const mockGroup = {
                id: 'group-1',
                workspaceId: 'ws-1',
                status: AlertStatus.OPEN,
            };

            (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(mockGroup);
            (prisma.alertGroup.update as jest.Mock).mockResolvedValue({
                ...mockGroup,
                status: AlertStatus.RESOLVED,
                resolvedAt: new Date(),
            });

            const result = await service.resolveAlertGroup('ws-1', 'group-1', 'user-1');

            expect(prisma.alertGroup.update).toHaveBeenCalledWith({
                where: { id: 'group-1' },
                data: expect.objectContaining({
                    status: AlertStatus.RESOLVED,
                    assigneeUserId: 'user-1'
                })
            });
            expect(mockEscalationService.cancelEscalation).toHaveBeenCalledWith('group-1');
            expect(result.status).toBe(AlertStatus.RESOLVED);
        });
    });
});

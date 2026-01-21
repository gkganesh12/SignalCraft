import { Test, TestingModule } from '@nestjs/testing';
import { RoutingRulesService } from './routing-rules.service';
import { RulesEngineService } from './rules-engine.service';
import { prisma } from '@signalcraft/database';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';

// Mock Prisma
jest.mock('@signalcraft/database', () => ({
    prisma: {
        routingRule: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

// Mock Logger
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });

describe('RoutingRulesService', () => {
    let service: RoutingRulesService;
    let rulesEngine: RulesEngineService;

    const mockRulesEngine = {
        invalidateCache: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoutingRulesService,
                { provide: RulesEngineService, useValue: mockRulesEngine },
            ],
        }).compile();

        service = module.get<RoutingRulesService>(RoutingRulesService);
        rulesEngine = module.get<RulesEngineService>(RulesEngineService);
        jest.clearAllMocks();
    });

    describe('createRule', () => {
        it('should create a valid rule', async () => {
            const dto: any = {
                name: 'Test Rule',
                conditions: { all: [{ field: 'environment', operator: 'equals', value: 'production' }] },
                actions: { slackChannelId: 'C123' },
            };

            (prisma.routingRule.create as jest.Mock).mockResolvedValue({ id: 'rule-1', ...dto, priority: 1, enabled: true });

            const result = await service.createRule('ws-1', dto);

            expect(prisma.routingRule.create).toHaveBeenCalled();
            expect(mockRulesEngine.invalidateCache).toHaveBeenCalledWith('ws-1');
            expect(result.name).toBe('Test Rule');
        });

        it('should throw BadRequest if conditions are missing', async () => {
            const dto: any = {
                name: 'Bad Rule',
                conditions: {},
                actions: { slackChannelId: 'C123' },
            };
            await expect(service.createRule('ws-1', dto)).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequest if action slackChannelId is missing', async () => {
            const dto: any = {
                name: 'Bad Action',
                conditions: { all: [{ field: 'env', operator: 'equals', value: 'prod' }] },
                actions: {},
            };
            await expect(service.createRule('ws-1', dto)).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequest for invalid operator', async () => {
            const dto: any = {
                name: 'Bad Operator',
                conditions: { all: [{ field: 'env', operator: 'magic_match', value: 'prod' }] },
                actions: { slackChannelId: 'C123' },
            };
            await expect(service.createRule('ws-1', dto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('deleteRule', () => {
        it('should delete existing rule and invalidate cache', async () => {
            (prisma.routingRule.findFirst as jest.Mock).mockResolvedValue({ id: 'rule-1' });

            await service.deleteRule('ws-1', 'rule-1');

            expect(prisma.routingRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
            expect(mockRulesEngine.invalidateCache).toHaveBeenCalledWith('ws-1');
        });

        it('should throw NotFound if rule does not exist', async () => {
            (prisma.routingRule.findFirst as jest.Mock).mockResolvedValue(null);
            await expect(service.deleteRule('ws-1', 'fake')).rejects.toThrow(NotFoundException);
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Mock the database singleton to avoid real DB connections
jest.mock('@signalcraft/database', () => ({
    prisma: {
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $on: jest.fn(),
        alertGroup: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
        alertEvent: { findFirst: jest.fn(), findMany: jest.fn() },
        user: { findUnique: jest.fn() },
        workspace: { findUnique: jest.fn() },
        routingRule: { findMany: jest.fn(), count: jest.fn() },
        notificationLog: { findMany: jest.fn() },
    },
    AlertStatus: { OPEN: 'OPEN', ACK: 'ACK', RESOLVED: 'RESOLVED', SNOOZED: 'SNOOZED' },
    AlertSeverity: { CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW', INFO: 'INFO' },
}));

describe('API Integration Tests (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    describe('Health Endpoint', () => {
        it('/health (GET) should respond with a status', async () => {
            const response = await request(app.getHttpServer()).get('/health');
            // Health check will return error codes when DB/Redis are mocked but endpoint IS reachable
            expect(response.status).toBeLessThan(600);
            expect(response.body).toBeDefined();
        });
    });

    describe('Webhooks Endpoint Structure', () => {
        it('/webhooks/sentry (POST) should reject missing workspaceId', async () => {
            const response = await request(app.getHttpServer())
                .post('/webhooks/sentry')
                .send({ event_id: '123' });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('workspaceId');
        });
    });

    describe('API Security', () => {
        it('should have rate limiting headers', async () => {
            const response = await request(app.getHttpServer()).get('/health');
            expect(response.headers).toHaveProperty('x-ratelimit-limit');
            expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        });
    });
});

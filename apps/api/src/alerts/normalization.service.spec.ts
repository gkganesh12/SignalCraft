import { Test, TestingModule } from '@nestjs/testing';
import { NormalizationService } from './normalization.service';

describe('NormalizationService', () => {
    let service: NormalizationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NormalizationService],
        }).compile();

        service = module.get<NormalizationService>(NormalizationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('normalizeSentry', () => {
        it('should normalize a standard Sentry payload', () => {
            const payload = {
                event_id: '12345',
                project: 'my-project',
                level: 'error',
                message: 'Something went wrong',
                environment: 'production',
            };

            const result = service.normalizeSentry(payload);

            expect(result).toMatchObject({
                source: 'SENTRY',
                sourceEventId: '12345',
                project: 'my-project',
                severity: 'high', // error -> high
                environment: 'production',
                description: 'Something went wrong',
            });
        });

        it('should extract data from nested event object', () => {
            const payload = {
                id: '999',
                event: {
                    event_id: '999',
                    title: 'Nested Title',
                    level: 'fatal',
                    tags: [['environment', 'staging']],
                }
            };

            const result = service.normalizeSentry(payload);

            expect(result).toMatchObject({
                source: 'SENTRY',
                sourceEventId: '999',
                title: 'Nested Title',
                severity: 'critical', // fatal -> critical
                environment: 'staging',
            });
        });

        it('should handle missing fields with defaults', () => {
            const payload = {
                event_id: 'abc',
                // No project, env, level
            };

            const result = service.normalizeSentry(payload);

            expect(result).toMatchObject({
                sourceEventId: 'abc',
                project: 'unknown',
                environment: 'unknown',
                severity: 'info', // default
            });
        });

        it('should throw error if event_id is missing', () => {
            const payload = {};
            expect(() => service.normalizeSentry(payload)).toThrow('Missing Sentry event id');
        });

        it('should extract tags correctly from array format', () => {
            const payload = {
                event_id: '1',
                tags: [['os', 'linux'], ['browser', 'chrome']]
            };
            const result = service.normalizeSentry(payload);
            expect(result.tags).toEqual({
                os: 'linux',
                browser: 'chrome'
            });
        });

        it('should extract tags correctly from object format', () => {
            const payload = {
                event_id: '1',
                tags: { os: 'linux', browser: 'chrome' }
            };
            const result = service.normalizeSentry(payload);
            expect(result.tags).toEqual({
                os: 'linux',
                browser: 'chrome'
            });
        });
    });
});

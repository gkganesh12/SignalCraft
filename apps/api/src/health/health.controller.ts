import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
  ) { }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database check
      async () => {
        const isUp = await this.healthService.checkDatabase();
        if (isUp) {
          return {
            database: {
              status: 'up',
            },
          };
        }
        throw new Error('Database check failed');
      },
      // Redis check
      async () => {
        const isUp = await this.healthService.checkRedis();
        if (isUp) {
          return {
            redis: {
              status: 'up',
            },
          };
        }
        throw new Error('Redis check failed');
      },
    ]);
  }
}

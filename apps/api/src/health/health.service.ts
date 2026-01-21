import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private redisClient: Redis | undefined;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      // Use lazy connection or handle error? ioredis handles reconnection.
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true // Connect on first use
      });
      // Handle error to prevent crash
      this.redisClient.on('error', (err) => { });
    }
  }

  async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }
    try {
      // Ensure connected
      if (this.redisClient.status !== 'ready' && this.redisClient.status !== 'connect') {
        await this.redisClient.connect().catch(() => { });
      }
      const pong = await this.redisClient.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}

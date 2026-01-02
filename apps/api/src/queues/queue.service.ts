import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, JobsOptions } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection?: Redis;
  private readonly queues = new Map<string, Queue>();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return;
    }

    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.createQueue('notifications');
    this.createQueue('escalations');
    this.createQueue('alert-processing');

  }

  private createQueue(name: string) {
    if (!this.connection) {
      return;
    }
    const queue = new Queue(name, { connection: this.connection });
    this.queues.set(name, queue);
  }

  async addJob(queueName: string, name: string, data: unknown, opts?: JobsOptions) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not configured: ${queueName}`);
    }
    return queue.add(name, data, { attempts: 3, ...opts });
  }

  async onModuleDestroy() {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
    if (this.connection) {
      await this.connection.quit();
    }
  }
}

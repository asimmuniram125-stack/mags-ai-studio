import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';

@Injectable()
export class BuildQueue {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('builds', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
  }

  async addBuildJob(data: any, options?: any): Promise<void> {
    await this.queue.add('build', data, options);
  }
}
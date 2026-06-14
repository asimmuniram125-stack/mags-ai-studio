import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';

@Injectable()
export class DeploymentQueue {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('deployments', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
  }

  async addDeploymentJob(data: any, options?: any): Promise<void> {
    await this.queue.add('deploy', data, options);
  }

  async addRollbackJob(data: any, options?: any): Promise<void> {
    await this.queue.add('rollback', data, options);
  }
}
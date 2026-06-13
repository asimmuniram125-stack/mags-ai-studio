import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgentQueueService {
  private readonly logger = new Logger(AgentQueueService.name);
  private queue: Queue;

  constructor(private configService: ConfigService) {
    this.initializeQueue();
  }

  private initializeQueue(): void {
    const redisHost = this.configService.get('redis.host') || 'localhost';
    const redisPort = this.configService.get('redis.port') || 6379;

    this.queue = new Queue('agent-tasks', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    this.logger.log('Agent queue initialized');
  }

  async addTask(taskId: string, data: any): Promise<void> {
    await this.queue.add(taskId, data);
  }

  getQueue(): Queue {
    return this.queue;
  }
}

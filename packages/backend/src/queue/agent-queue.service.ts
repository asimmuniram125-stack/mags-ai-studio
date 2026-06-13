import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { AgentExecutorService } from '@/agents/agent-executor.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AgentQueueService {
  private agentJobQueue: Queue;
  private workflowQueue: Queue;
  private readonly logger = new Logger(AgentQueueService.name);

  constructor(
    private configService: ConfigService,
    private agentExecutor: AgentExecutorService,
    private prisma: PrismaService,
  ) {
    this.initializeQueues();
  }

  /**
   * Initialize BullMQ queues
   */
  private initializeQueues(): void {
    const redisConfig = {
      host: this.configService.get('queue.host'),
      port: this.configService.get('queue.port'),
      password: this.configService.get('queue.password'),
      db: this.configService.get('queue.db'),
    };

    this.agentJobQueue = new Queue('agent-jobs', { connection: redisConfig as any });
    this.workflowQueue = new Queue('workflows', { connection: redisConfig as any });

    // Setup workers
    this.setupAgentWorker(redisConfig as any);
    this.setupWorkflowWorker(redisConfig as any);

    this.logger.log('Queues initialized');
  }

  /**
   * Add task to queue
   */
  async addTask(data: any): Promise<void> {
    await this.agentJobQueue.add('execute-task', data, {
      ...this.configService.get('queue.defaultJobOptions'),
      priority: this.priorityToNumber(data.priority),
    });
  }

  /**
   * Add workflow to queue
   */
  async addWorkflow(data: any): Promise<void> {
    await this.workflowQueue.add('execute-workflow', data, {
      ...this.configService.get('queue.defaultJobOptions'),
    });
  }

  /**
   * Setup agent job worker
   */
  private setupAgentWorker(redisConfig: any): void {
    const worker = new Worker(
      'agent-jobs',
      async (job) => {
        try {
          this.logger.log(`Processing task: ${job.data.taskId}`);

          // Get task from DB
          const task = await this.prisma.agentTask.findUnique({
            where: { id: job.data.taskId },
          });

          if (!task) {
            throw new Error(`Task not found: ${job.data.taskId}`);
          }

          // Execute task
          const result = await this.agentExecutor.executeTask(task as any);

          return result;
        } catch (error) {
          this.logger.error(`Task processing failed: ${error.message}`);
          throw error;
        }
      },
      { connection: redisConfig as any, concurrency: this.configService.get('queue.concurrency') },
    );

    worker.on('completed', (job) => {
      this.logger.log(`Task completed: ${job.data.taskId}`);
    });

    worker.on('failed', (job, error) => {
      this.logger.error(`Task failed: ${job?.data?.taskId} - ${error.message}`);
    });
  }

  /**
   * Setup workflow worker
   */
  private setupWorkflowWorker(redisConfig: any): void {
    const worker = new Worker(
      'workflows',
      async (job) => {
        this.logger.log(`Processing workflow: ${job.data.workflowId}`);
        // Workflow execution logic
      },
      { connection: redisConfig as any },
    );
  }

  /**
   * Helper to convert priority string to number
   */
  private priorityToNumber(priority?: string): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'medium':
        return 5;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }
}

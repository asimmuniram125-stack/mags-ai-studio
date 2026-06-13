import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AgentQueueService } from '@/queue/agent-queue.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private queueService: AgentQueueService,
  ) {}

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, userId: string): Promise<any> {
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
      include: {
        agent: true,
        childTasks: true,
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.userId !== userId) {
      throw new BadRequestException('Unauthorized access');
    }

    return task;
  }

  /**
   * Get agent tasks
   */
  async getAgentTasks(
    agentId: string,
    userId: string,
    skip: number = 0,
    take: number = 10,
  ): Promise<any> {
    const [tasks, total] = await Promise.all([
      this.prisma.agentTask.findMany({
        where: { agentId, userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.agentTask.count({ where: { agentId, userId } }),
    ]);

    return { tasks, total };
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string, userId: string): Promise<void> {
    const task = await this.getTaskById(taskId, userId);

    if (['completed', 'failed'].includes(task.status)) {
      throw new BadRequestException('Cannot cancel completed or failed task');
    }

    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'cancelled' },
    });
  }

  /**
   * Retry failed task
   */
  async retryTask(taskId: string, userId: string): Promise<string> {
    const task = await this.getTaskById(taskId, userId);

    if (task.status !== 'failed') {
      throw new BadRequestException('Can only retry failed tasks');
    }

    const retryCount = (task.retryCount || 0) + 1;
    if (retryCount > 3) {
      throw new BadRequestException('Max retries exceeded');
    }

    // Update task
    const updatedTask = await this.prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: 'pending',
        retryCount,
        error: null,
      },
    });

    // Re-queue
    await this.queueService.addTask({
      taskId: updatedTask.id,
      agentId: updatedTask.agentId || '',
      userId,
      goal: updatedTask.goal,
      input: updatedTask.input as Record<string, any>,
      context: updatedTask.context,
      maxTokens: 4000,
    });

    return taskId;
  }
}

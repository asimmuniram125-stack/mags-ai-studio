import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    private prisma: PrismaService,
    private workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * Create workflow
   */
  async createWorkflow(userId: string, createWorkflowDto: CreateWorkflowDto): Promise<any> {
    const { name, description, nodes, edges } = createWorkflowDto;

    const workflow = await this.prisma.agentWorkflow.create({
      data: {
        userId,
        name,
        description,
        nodes,
        edges,
        isDraft: true,
      },
    });

    return workflow;
  }

  /**
   * Get workflow
   */
  async getWorkflow(workflowId: string, userId: string): Promise<any> {
    const workflow = await this.prisma.agentWorkflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    return workflow;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string, userId: string): Promise<string> {
    const workflow = await this.getWorkflow(workflowId, userId);

    if (workflow.isDraft) {
      throw new BadRequestException('Cannot execute draft workflow');
    }

    const executionId = await this.workflowEngine.executeWorkflow(workflowId, userId);

    // Update execution count
    await this.prisma.agentWorkflow.update({
      where: { id: workflowId },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });

    return executionId;
  }

  /**
   * Publish workflow
   */
  async publishWorkflow(workflowId: string, userId: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId, userId);

    await this.prisma.agentWorkflow.update({
      where: { id: workflowId },
      data: { isDraft: false },
    });
  }
}

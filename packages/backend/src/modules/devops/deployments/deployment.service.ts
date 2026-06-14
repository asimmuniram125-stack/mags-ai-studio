import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateDeploymentDto, RunDeploymentDto } from './dto/create-deployment.dto';
import { DeploymentQueue } from '../queue/deployment.queue';
import { Deployment, DeploymentStatus, Environment } from '@prisma/client';

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);

  constructor(
    private prisma: PrismaService,
    private deploymentQueue: DeploymentQueue,
  ) {}

  async createDeployment(dto: CreateDeploymentDto, userId: string): Promise<Deployment> {
    this.logger.log(`Creating deployment: ${dto.name}`);

    const deployment = await this.prisma.deployment.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        environment: dto.environment,
        targetType: dto.targetType,
        appId: dto.appId,
        pipelineId: dto.pipelineId,
        targetConfig: dto.targetConfig,
        createdBy: userId,
        version: this.generateVersion(),
        status: DeploymentStatus.PENDING,
      },
    });

    return deployment;
  }

  async runDeployment(deploymentId: string, dto: RunDeploymentDto): Promise<void> {
    this.logger.log(`Running deployment: ${deploymentId}`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        pipeline: {
          include: { stages: { orderBy: { order: 'asc' } } },
        },
        generatedApp: true,
      },
    });

    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    // Update status
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: DeploymentStatus.BUILDING,
        startedAt: new Date(),
      },
    });

    // Queue deployment job
    await this.deploymentQueue.addDeploymentJob(
      {
        deploymentId,
        overrideConfig: dto.overrideConfig,
        triggerReason: dto.triggerReason,
      },
      { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  async getDeployment(deploymentId: string): Promise<Deployment> {
    return this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        pipeline: { include: { stages: true } },
        jobs: true,
        logs: { take: 100, orderBy: { timestamp: 'desc' } },
        metrics: { take: 100, orderBy: { timestamp: 'desc' } },
      },
    });
  }

  async listDeployments(projectId: string, environment?: Environment): Promise<Deployment[]> {
    return this.prisma.deployment.findMany({
      where: {
        projectId,
        ...(environment && { environment }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        pipeline: true,
        metrics: { take: 10 },
      },
    });
  }

  async rollbackDeployment(deploymentId: string, reason?: string): Promise<Deployment> {
    this.logger.log(`Rolling back deployment: ${deploymentId}`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment?.previousDeploymentId) {
      throw new Error('No previous deployment to rollback to');
    }

    // Queue rollback job
    await this.deploymentQueue.addRollbackJob({
      deploymentId,
      previousDeploymentId: deployment.previousDeploymentId,
      reason,
    });

    return this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: DeploymentStatus.ROLLED_BACK },
    });
  }

  async updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus,
    error?: string,
  ): Promise<void> {
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status,
        ...(status === DeploymentStatus.SUCCESS && { completedAt: new Date() }),
        ...(status === DeploymentStatus.FAILED && { failedAt: new Date() }),
      },
    });

    if (error) {
      await this.prisma.deploymentLog.create({
        data: {
          deploymentId,
          level: 'ERROR',
          message: error,
          timestamp: new Date(),
        },
      });
    }
  }

  private generateVersion(): string {
    const date = new Date();
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}-${Date.now().toString(36).toUpperCase()}`;
  }
}
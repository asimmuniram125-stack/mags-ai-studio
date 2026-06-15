import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { DeployGloballyDto, DeployCanaryDto } from '../dto/infrastructure.dto';
import { DeploymentStatus, Region } from '../entities/infrastructure.entity';
import { KubernetesService } from './kubernetes.service';

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);

  constructor(
    private prisma: PrismaService,
    private kubernetesService: KubernetesService,
    @InjectQueue('infrastructure') private infraQueue: Queue,
  ) {}

  async deployGlobally(
    organizationId: string,
    userId: string,
    dto: DeployGloballyDto,
  ): Promise<any> {
    this.logger.log(`Starting global deployment for app: ${dto.appId}`);

    // Create deployment record
    const deployment = await this.prisma.deployment.create({
      data: {
        appId: dto.appId,
        organizationId,
        status: DeploymentStatus.PENDING,
        deployedBy: userId,
        environment: 'production',
        deploymentNumber: await this.getNextDeploymentNumber(),
      },
    });

    // Create region deployments
    const regionDeployments = await Promise.all(
      dto.regions.map((region) =>
        this.prisma.deploymentRegion.create({
          data: {
            deploymentId: deployment.id,
            region,
            status: DeploymentStatus.PENDING,
            metadata: {
              canary: dto.canary || false,
              canaryPercentage: dto.canaryPercentage || 0,
            },
          },
        }),
      ),
    );

    // Queue deployments per region
    for (const region of dto.regions) {
      await this.infraQueue.add(
        'deploy-to-region',
        {
          deploymentId: deployment.id,
          region,
          appId: dto.appId,
          canary: dto.canary,
          canaryPercentage: dto.canaryPercentage,
          tag: dto.tag,
        },
        { delay: 5000, removeOnComplete: true },
      );
    }

    return {
      deployment,
      regions: regionDeployments,
    };
  }

  async deployCanary(
    deploymentId: string,
    userId: string,
    dto: DeployCanaryDto,
  ): Promise<any> {
    this.logger.log(`Starting canary deployment for deployment: ${deploymentId}`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { regions: true },
    });

    if (!deployment) {
      throw new NotFoundException(`Deployment not found: ${deploymentId}`);
    }

    // Update deployment to canary status
    const updated = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: DeploymentStatus.CANARY },
    });

    // Queue canary deployment
    await this.infraQueue.add(
      'deploy-canary',
      {
        deploymentId,
        initialPercentage: dto.initialPercentage,
        incrementPercentageEvery: dto.incrmentPercentageEvery,
      },
      { removeOnComplete: true },
    );

    return updated;
  }

  async rollback(deploymentId: string, userId: string): Promise<any> {
    this.logger.log(`Rolling back deployment: ${deploymentId}`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { regions: true },
    });

    if (!deployment) {
      throw new NotFoundException(`Deployment not found: ${deploymentId}`);
    }

    if (!deployment.previousDeploymentId) {
      throw new BadRequestException('No previous deployment to rollback to');
    }

    // Update current deployment
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: DeploymentStatus.ROLLED_BACK },
    });

    // Get previous deployment
    const previousDeployment = await this.prisma.deployment.findUnique({
      where: { id: deployment.previousDeploymentId },
    });

    if (!previousDeployment) {
      throw new NotFoundException('Previous deployment not found');
    }

    // Queue rollback operations
    for (const region of deployment.regions) {
      await this.infraQueue.add(
        'rollback-deployment',
        {
          deploymentId: deployment.id,
          previousDeploymentId: previousDeployment.id,
          region: region.region,
        },
        { removeOnComplete: true },
      );
    }

    return {
      deploymentId,
      rollbackTo: previousDeployment.id,
      status: DeploymentStatus.ROLLED_BACK,
    };
  }

  async getDeploymentStatus(deploymentId: string): Promise<any> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { regions: true },
    });

    if (!deployment) {
      throw new NotFoundException(`Deployment not found: ${deploymentId}`);
    }

    return {
      deploymentId: deployment.id,
      appId: deployment.appId,
      status: deployment.status,
      regions: deployment.regions,
      deployedAt: deployment.deployedAt,
      completedAt: deployment.completedAt,
      error: deployment.error,
    };
  }

  async getDeploymentHistory(appId: string, limit: number = 20): Promise<any[]> {
    return this.prisma.deployment.findMany({
      where: { appId },
      include: { regions: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async getNextDeploymentNumber(): Promise<number> {
    const lastDeployment = await this.prisma.deployment.findFirst({
      orderBy: { deploymentNumber: 'desc' },
      select: { deploymentNumber: true },
    });

    return (lastDeployment?.deploymentNumber || 0) + 1;
  }
}

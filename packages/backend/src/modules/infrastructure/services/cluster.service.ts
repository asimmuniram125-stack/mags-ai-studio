import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CreateClusterDto, ScaleClusterDto } from '../dto/infrastructure.dto';
import { ClusterStatus, Region } from '../entities/infrastructure.entity';
import { KubernetesService } from './kubernetes.service';
import { CloudProviderService } from './cloud-provider.service';

@Injectable()
export class ClusterService {
  private readonly logger = new Logger(ClusterService.name);

  constructor(
    private prisma: PrismaService,
    private kubernetesService: KubernetesService,
    private cloudProviderService: CloudProviderService,
    @InjectQueue('infrastructure') private infraQueue: Queue,
  ) {}

  async createCluster(organizationId: string, userId: string, dto: CreateClusterDto): Promise<any> {
    this.logger.log(`Creating cluster: ${dto.name} in region: ${dto.region}`);

    // Create cluster record
    const cluster = await this.prisma.infrastructureCluster.create({
      data: {
        name: dto.name,
        region: dto.region,
        cloudProvider: dto.cloudProvider,
        organizationId,
        kubernetesVersion: dto.kubernetesVersion,
        nodeCount: dto.nodeCount,
        nodeType: dto.nodeType,
        networkConfig: dto.networkConfig,
        status: ClusterStatus.CREATING,
        createdBy: userId,
      },
    });

    // Queue cluster provisioning
    await this.infraQueue.add(
      'provision-cluster',
      {
        clusterId: cluster.id,
        dto,
        cloudProvider: dto.cloudProvider,
      },
      { removeOnComplete: true },
    );

    return cluster;
  }

  async getCluster(id: string): Promise<any> {
    const cluster = await this.prisma.infrastructureCluster.findUnique({
      where: { id },
      include: { services: true, scalingPolicies: true },
    });

    if (!cluster) {
      throw new NotFoundException(`Cluster not found: ${id}`);
    }

    return cluster;
  }

  async getOrganizationClusters(organizationId: string): Promise<any[]> {
    return this.prisma.infrastructureCluster.findMany({
      where: { organizationId },
      include: { services: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClustersByRegion(region: Region): Promise<any[]> {
    return this.prisma.infrastructureCluster.findMany({
      where: { region, status: ClusterStatus.ACTIVE },
      include: { services: true },
    });
  }

  async scaleCluster(
    clusterId: string,
    userId: string,
    dto: ScaleClusterDto,
  ): Promise<any> {
    this.logger.log(`Scaling cluster ${clusterId} to ${dto.desiredNodeCount} nodes`);

    const cluster = await this.getCluster(clusterId);

    if (cluster.status === ClusterStatus.SCALING) {
      throw new BadRequestException('Cluster is already scaling');
    }

    const updated = await this.prisma.infrastructureCluster.update({
      where: { id: clusterId },
      data: {
        status: ClusterStatus.SCALING,
        nodeCount: dto.desiredNodeCount,
      },
    });

    // Queue scaling operation
    await this.infraQueue.add(
      'scale-cluster',
      {
        clusterId,
        desiredNodeCount: dto.desiredNodeCount,
        reason: dto.reason,
      },
      { removeOnComplete: true },
    );

    return updated;
  }

  async getClusterHealth(clusterId: string): Promise<any> {
    const cluster = await this.getCluster(clusterId);

    const health = await this.kubernetesService.getClusterHealth(cluster);

    return {
      clusterId,
      clusterName: cluster.name,
      status: cluster.status,
      nodeCount: cluster.nodeCount,
      nodeHealth: health.nodes,
      resourceUtilization: health.resourceUtilization,
      services: health.services,
      timestamp: new Date(),
    };
  }

  async deleteCluster(clusterId: string, userId: string): Promise<void> {
    this.logger.log(`Deleting cluster: ${clusterId}`);

    const cluster = await this.getCluster(clusterId);

    // Update status
    await this.prisma.infrastructureCluster.update({
      where: { id: clusterId },
      data: { status: ClusterStatus.DESTROYING },
    });

    // Queue deletion
    await this.infraQueue.add(
      'delete-cluster',
      { clusterId, cloudProvider: cluster.cloudProvider },
      { removeOnComplete: true },
    );
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateScalingPolicyDto } from '../dto/infrastructure.dto';
import { KubernetesService } from './kubernetes.service';
import { CloudProviderService } from './cloud-provider.service';

@Injectable()
export class ScalingService {
  private readonly logger = new Logger(ScalingService.name);

  constructor(
    private prisma: PrismaService,
    private kubernetesService: KubernetesService,
    private cloudProviderService: CloudProviderService,
  ) {}

  async createScalingPolicy(
    clusterId: string,
    userId: string,
    dto: CreateScalingPolicyDto,
  ): Promise<any> {
    this.logger.log(`Creating scaling policy: ${dto.name}`);

    const cluster = await this.prisma.infrastructureCluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      throw new NotFoundException(`Cluster not found: ${clusterId}`);
    }

    const policy = await this.prisma.scalingPolicy.create({
      data: {
        name: dto.name,
        clusterId,
        strategy: dto.strategy,
        targetService: dto.targetService,
        minReplicas: dto.minReplicas,
        maxReplicas: dto.maxReplicas,
        rules: dto.rules,
        active: true,
      },
    });

    return policy;
  }

  async getScalingPolicy(policyId: string): Promise<any> {
    const policy = await this.prisma.scalingPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`Scaling policy not found: ${policyId}`);
    }

    return policy;
  }

  async getClusterScalingPolicies(clusterId: string): Promise<any[]> {
    return this.prisma.scalingPolicy.findMany({
      where: { clusterId, active: true },
    });
  }

  async evaluateScalingPolicies(clusterId: string): Promise<void> {
    this.logger.log(`Evaluating scaling policies for cluster: ${clusterId}`);

    const policies = await this.getClusterScalingPolicies(clusterId);
    const cluster = await this.prisma.infrastructureCluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) return;

    for (const policy of policies) {
      for (const rule of policy.rules) {
        // Evaluate rule and scale if needed
        const shouldScale = await this.shouldScale(cluster, rule);

        if (shouldScale) {
          await this.scaleService(cluster, policy, rule);
        }
      }
    }
  }

  private async shouldScale(cluster: any, rule: any): Promise<boolean> {
    // Get current metrics
    const metrics = await this.getClusterMetrics(cluster);

    const metricValue = metrics[rule.metric];

    if (!metricValue) return false;

    switch (rule.operator) {
      case 'greater_than':
        return metricValue > rule.threshold;
      case 'less_than':
        return metricValue < rule.threshold;
      case 'equals':
        return metricValue === rule.threshold;
      default:
        return false;
    }
  }

  private async getClusterMetrics(cluster: any): Promise<Record<string, number>> {
    // TODO: Integrate with Prometheus/CloudWatch for real metrics
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      queue_depth: Math.random() * 1000,
    };
  }

  private async scaleService(cluster: any, policy: any, rule: any): Promise<void> {
    this.logger.log(`Scaling service: ${policy.targetService} - ${rule.action}`);

    const currentReplicas = await this.getCurrentReplicas(cluster, policy.targetService);
    let newReplicas = currentReplicas;

    if (rule.action === 'scale_up') {
      newReplicas = Math.min(
        currentReplicas + rule.scaleBy,
        policy.maxReplicas,
      );
    } else if (rule.action === 'scale_down') {
      newReplicas = Math.max(
        currentReplicas - rule.scaleBy,
        policy.minReplicas,
      );
    }

    if (newReplicas !== currentReplicas) {
      await this.kubernetesService.scaleDeployment(
        cluster.id,
        'default',
        policy.targetService,
        newReplicas,
      );

      // Log scaling event
      await this.prisma.scalingEvent.create({
        data: {
          policyId: policy.id,
          clusterId: cluster.id,
          serviceName: policy.targetService,
          previousReplicas: currentReplicas,
          newReplicas,
          reason: `${rule.metric} ${rule.operator} ${rule.threshold}`,
        },
      });
    }
  }

  private async getCurrentReplicas(cluster: any, serviceName: string): Promise<number> {
    const deployment = await this.kubernetesService.getDeploymentStatus(
      cluster.id,
      'default',
      serviceName,
    );

    return deployment.replicas || 0;
  }
}

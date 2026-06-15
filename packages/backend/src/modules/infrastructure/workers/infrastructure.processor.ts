import { Injectable, Logger } from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '@/database/prisma.service';
import { ClusterService } from '../services/cluster.service';
import { KubernetesService } from '../services/kubernetes.service';
import { CloudProviderService } from '../services/cloud-provider.service';
import { DeploymentService } from '../services/deployment.service';
import { ScalingService } from '../services/scaling.service';
import { InfrastructureGateway } from '../infrastructure.gateway';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';

@Injectable()
export class InfrastructureProcessor {
  private readonly logger = new Logger(InfrastructureProcessor.name);
  private worker: Worker;
  private healthCheckCron: CronJob;
  private scalingEvalCron: CronJob;

  constructor(
    @InjectQueue('infrastructure') private infraQueue: Queue,
    private prisma: PrismaService,
    private clusterService: ClusterService,
    private kubernetesService: KubernetesService,
    private cloudProviderService: CloudProviderService,
    private deploymentService: DeploymentService,
    private scalingService: ScalingService,
    private infraGateway: InfrastructureGateway,
    private configService: ConfigService,
  ) {
    this.setupWorker();
    this.setupCronJobs();
  }

  private setupWorker(): void {
    this.worker = new Worker(
      'infrastructure',
      async (job) => {
        switch (job.name) {
          case 'provision-cluster':
            await this.handleProvisionCluster(job.data);
            break;
          case 'scale-cluster':
            await this.handleScaleCluster(job.data);
            break;
          case 'delete-cluster':
            await this.handleDeleteCluster(job.data);
            break;
          case 'deploy-to-region':
            await this.handleDeployToRegion(job.data);
            break;
          case 'deploy-canary':
            await this.handleDeployCanary(job.data);
            break;
          case 'rollback-deployment':
            await this.handleRollbackDeployment(job.data);
            break;
          case 'check-cluster-health':
            await this.handleCheckClusterHealth(job.data);
            break;
          case 'evaluate-scaling':
            await this.handleEvaluateScaling(job.data);
            break;
          default:
            this.logger.warn(`Unknown job type: ${job.name}`);
        }
      },
      {
        connection: {
          host: this.configService.get('REDIS_HOST') || 'localhost',
          port: this.configService.get('REDIS_PORT') || 6379,
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Infrastructure job ${job?.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Infrastructure job ${job?.id} failed:`, err);
    });
  }

  private setupCronJobs(): void {
    // Check cluster health every 5 minutes
    this.healthCheckCron = new CronJob('*/5 * * * *', async () => {
      this.logger.log('Running cluster health checks');
      await this.performHealthChecks();
    });

    // Evaluate scaling policies every minute
    this.scalingEvalCron = new CronJob('* * * * *', async () => {
      this.logger.log('Evaluating scaling policies');
      await this.performScalingEvaluation();
    });

    this.healthCheckCron.start();
    this.scalingEvalCron.start();
  }

  private async performHealthChecks(): Promise<void> {
    const clusters = await this.prisma.infrastructureCluster.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const cluster of clusters) {
      try {
        await this.infraQueue.add(
          'check-cluster-health',
          { clusterId: cluster.id },
          { removeOnComplete: true },
        );
      } catch (error) {
        this.logger.error(`Failed to queue health check for cluster ${cluster.id}:`, error);
      }
    }
  }

  private async performScalingEvaluation(): Promise<void> {
    const clusters = await this.prisma.infrastructureCluster.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const cluster of clusters) {
      try {
        await this.infraQueue.add(
          'evaluate-scaling',
          { clusterId: cluster.id },
          { removeOnComplete: true },
        );
      } catch (error) {
        this.logger.error(`Failed to queue scaling evaluation for cluster ${cluster.id}:`, error);
      }
    }
  }

  private async handleProvisionCluster(data: any): Promise<void> {
    this.logger.log(`Provisioning cluster: ${data.clusterId}`);

    try {
      const cluster = await this.prisma.infrastructureCluster.findUnique({
        where: { id: data.clusterId },
      });

      if (!cluster) return;

      // Create EKS cluster
      const eksCluster = await this.cloudProviderService.createEKSCluster(
        cluster.name,
        cluster.region,
        {
          kubernetesVersion: cluster.kubernetesVersion,
          roleArn: this.configService.get('EKS_CLUSTER_ROLE_ARN'),
          networkConfig: cluster.networkConfig,
        },
      );

      // Create node group
      const nodeGroup = await this.cloudProviderService.createNodeGroup(
        cluster.name,
        cluster.region,
        {
          nodeCount: cluster.nodeCount,
          nodeType: cluster.nodeType,
          nodeRoleArn: this.configService.get('EKS_NODE_ROLE_ARN'),
          networkConfig: cluster.networkConfig,
        },
      );

      // Update cluster status
      await this.prisma.infrastructureCluster.update({
        where: { id: data.clusterId },
        data: {
          status: 'ACTIVE',
          kubernetesClusterId: eksCluster.name,
        },
      });

      // Notify via WebSocket
      this.infraGateway.emitClusterUpdate(data.clusterId, {
        clusterId: data.clusterId,
        status: 'ACTIVE',
      });

      this.logger.log(`Cluster ${data.clusterId} provisioned successfully`);
    } catch (error) {
      this.logger.error(`Cluster provisioning failed: ${error}`);

      await this.prisma.infrastructureCluster.update({
        where: { id: data.clusterId },
        data: { status: 'FAILED' },
      });

      this.infraGateway.emitAlert(data.organizationId, {
        severity: 'error',
        message: `Cluster provisioning failed: ${error}`,
      });
    }
  }

  private async handleScaleCluster(data: any): Promise<void> {
    this.logger.log(`Scaling cluster: ${data.clusterId}`);

    try {
      const cluster = await this.prisma.infrastructureCluster.findUnique({
        where: { id: data.clusterId },
      });

      if (!cluster) return;

      await this.cloudProviderService.scaleNodeGroup(
        cluster.name,
        cluster.region,
        data.desiredNodeCount,
      );

      await this.prisma.infrastructureCluster.update({
        where: { id: data.clusterId },
        data: { nodeCount: data.desiredNodeCount, status: 'ACTIVE' },
      });

      this.infraGateway.emitScalingEvent(data.clusterId, {
        action: 'scale',
        previousNodeCount: cluster.nodeCount,
        newNodeCount: data.desiredNodeCount,
        reason: data.reason,
      });
    } catch (error) {
      this.logger.error(`Cluster scaling failed: ${error}`);
    }
  }

  private async handleDeleteCluster(data: any): Promise<void> {
    this.logger.log(`Deleting cluster: ${data.clusterId}`);

    try {
      const cluster = await this.prisma.infrastructureCluster.findUnique({
        where: { id: data.clusterId },
      });

      if (!cluster) return;

      await this.cloudProviderService.deleteEKSCluster(cluster.name, cluster.region);

      await this.prisma.infrastructureCluster.delete({
        where: { id: data.clusterId },
      });

      this.logger.log(`Cluster ${data.clusterId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Cluster deletion failed: ${error}`);
    }
  }

  private async handleDeployToRegion(data: any): Promise<void> {
    this.logger.log(`Deploying app ${data.appId} to region ${data.region}`);

    try {
      // Update deployment region status
      await this.prisma.deploymentRegion.update({
        where: {
          deploymentId_region: {
            deploymentId: data.deploymentId,
            region: data.region,
          },
        },
        data: { status: 'DEPLOYING' },
      });

      this.infraGateway.emitDeploymentUpdate(data.deploymentId, {
        region: data.region,
        status: 'DEPLOYING',
      });

      // TODO: Deploy Docker image to Kubernetes
      // 1. Build Docker image
      // 2. Push to ECR
      // 3. Create Kubernetes deployment
      // 4. Wait for rollout

      // Simulate deployment steps
      const steps = ['BUILDING', 'PUSHING', 'DEPLOYING', 'LIVE'];

      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        this.infraGateway.emitDeploymentUpdate(data.deploymentId, {
          region: data.region,
          status: step,
        });
      }

      // Update deployment region to LIVE
      await this.prisma.deploymentRegion.update({
        where: {
          deploymentId_region: {
            deploymentId: data.deploymentId,
            region: data.region,
          },
        },
        data: {
          status: 'LIVE',
          deployedAt: new Date(),
        },
      });

      this.infraGateway.emitDeploymentUpdate(data.deploymentId, {
        region: data.region,
        status: 'LIVE',
        deployedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Deployment to region failed: ${error}`);

      await this.prisma.deploymentRegion.update({
        where: {
          deploymentId_region: {
            deploymentId: data.deploymentId,
            region: data.region,
          },
        },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: error.toString(),
        },
      });

      this.infraGateway.emitDeploymentUpdate(data.deploymentId, {
        region: data.region,
        status: 'FAILED',
        error: error.toString(),
      });
    }
  }

  private async handleDeployCanary(data: any): Promise<void> {
    this.logger.log(`Starting canary deployment for ${data.deploymentId}`);

    try {
      let currentPercentage = data.initialPercentage;
      const maxPercentage = 100;
      const incrementEvery = data.incrementPercentageEvery || 300; // 5 minutes

      while (currentPercentage < maxPercentage) {
        this.infraGateway.emitDeploymentUpdate(data.deploymentId, {
          deploymentType: 'CANARY',
          canaryPercentage: currentPercentage,
        });

        await new Promise((resolve) => setTimeout(resolve, incrementEvery * 1000));
        currentPercentage = Math.min(currentPercentage + 25, maxPercentage);
      }

      // Canary complete
      await this.prisma.deployment.update({
        where: { id: data.deploymentId },
        data: { status: 'LIVE' },
      });

      this.infraGateway.emitDeploymentUpdate(data.deploymentId, {
        deploymentType: 'CANARY',
        canaryPercentage: 100,
        status: 'LIVE',
      });
    } catch (error) {
      this.logger.error(`Canary deployment failed: ${error}`);
    }
  }

  private async handleRollbackDeployment(data: any): Promise<void> {
    this.logger.log(`Rolling back deployment ${data.deploymentId}`);

    try {
      // Get previous deployment
      const previousDeployment = await this.prisma.deployment.findUnique({
        where: { id: data.previousDeploymentId },
      });

      if (!previousDeployment) {
        throw new Error('Previous deployment not found');
      }

      // Trigger rollback in Kubernetes
      await this.kubernetesService.rolloutDeployment(
        data.clusterId || 'default',
        'default',
        'app-deployment',
      );

      this.infraGateway.emitDeploymentUpdate(data.deploymentId, {
        status: 'ROLLED_BACK',
        rolledBackTo: data.previousDeploymentId,
      });
    } catch (error) {
      this.logger.error(`Rollback failed: ${error}`);
    }
  }

  private async handleCheckClusterHealth(data: any): Promise<void> {
    try {
      const cluster = await this.prisma.infrastructureCluster.findUnique({
        where: { id: data.clusterId },
      });

      if (!cluster) return;

      const health = await this.clusterService.getClusterHealth(data.clusterId);

      this.infraGateway.emitClusterHealth(data.clusterId, health);

      // Check for alerts
      const unhealthyNodes = health.nodeHealth.filter((n: any) => n.status !== 'True');
      if (unhealthyNodes.length > 0) {
        this.infraGateway.emitAlert(cluster.organizationId, {
          severity: 'warning',
          message: `${unhealthyNodes.length} unhealthy nodes detected in cluster ${cluster.name}`,
        });
      }
    } catch (error) {
      this.logger.error(`Health check failed: ${error}`);
    }
  }

  private async handleEvaluateScaling(data: any): Promise<void> {
    try {
      await this.scalingService.evaluateScalingPolicies(data.clusterId);
    } catch (error) {
      this.logger.error(`Scaling evaluation failed: ${error}`);
    }
  }
}

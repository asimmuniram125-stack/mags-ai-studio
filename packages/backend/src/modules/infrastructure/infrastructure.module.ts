import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '@/database/prisma.service';
import { InfrastructureController } from './controllers/infrastructure.controller';
import { ClusterService } from './services/cluster.service';
import { DeploymentService } from './services/deployment.service';
import { ScalingService } from './services/scaling.service';
import { LoadBalancerService } from './services/load-balancer.service';
import { KubernetesService } from './services/kubernetes.service';
import { CloudProviderService } from './services/cloud-provider.service';
import { InfrastructureProcessor } from './workers/infrastructure.processor';
import { InfrastructureGateway } from './infrastructure.gateway';

@Module({
  imports: [BullModule.registerQueue({ name: 'infrastructure' })],
  controllers: [InfrastructureController],
  providers: [
    PrismaService,
    ClusterService,
    DeploymentService,
    ScalingService,
    LoadBalancerService,
    KubernetesService,
    CloudProviderService,
    InfrastructureProcessor,
    InfrastructureGateway,
  ],
  exports: [
    ClusterService,
    DeploymentService,
    ScalingService,
    LoadBalancerService,
  ],
})
export class InfrastructureModule {}

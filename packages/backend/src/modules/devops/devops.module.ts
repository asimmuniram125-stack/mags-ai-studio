import { Module } from '@nestjs/common';
import { DeploymentService } from './deployments/deployment.service';
import { PipelineExecutorService } from './pipelines/pipeline-executor.service';
import { BuildService } from './builds/build.service';
import { ContainerService } from './containers/container.service';
import { ProvisionerService } from './infrastructure/provisioner.service';
import { EnvironmentService } from './environments/environment.service';
import { HealthService } from './monitoring/health.service';
import { MonitoringService } from './monitoring/monitoring.service';
import { DockerfileGenerator } from './containers/dockerfile.generator';
import { DeploymentQueue } from './queue/deployment.queue';
import { BuildQueue } from './queue/build.queue';
import { PrismaService } from '@/database/prisma.service';

@Module({
  providers: [
    DeploymentService,
    PipelineExecutorService,
    BuildService,
    ContainerService,
    ProvisionerService,
    EnvironmentService,
    HealthService,
    MonitoringService,
    DockerfileGenerator,
    DeploymentQueue,
    BuildQueue,
    PrismaService,
  ],
  exports: [
    DeploymentService,
    PipelineExecutorService,
    BuildService,
    ContainerService,
    ProvisionerService,
    EnvironmentService,
    HealthService,
    MonitoringService,
  ],
})
export class DevopsModule {}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Deployment, HealthStatus, DeploymentStatus } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private prisma: PrismaService) {}

  async performHealthCheck(deploymentId: string): Promise<boolean> {
    this.logger.log(`Performing health check: ${deploymentId}`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    try {
      // Check endpoint health
      const healthUrl = this.getHealthCheckUrl(deployment);
      const response = await axios.get(healthUrl, { timeout: 5000 });

      const isHealthy = response.status >= 200 && response.status < 300;

      const healthStatus = isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY;

      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          healthStatus,
          lastHealthCheckAt: new Date(),
        },
      });

      if (!isHealthy) {
        this.logger.warn(`Health check failed for deployment: ${deploymentId}`);
        return false;
      }

      this.logger.log(`Health check passed: ${deploymentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Health check error: ${deploymentId}`, error);

      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          healthStatus: HealthStatus.UNHEALTHY,
          lastHealthCheckAt: new Date(),
        },
      });

      return false;
    }
  }

  private getHealthCheckUrl(deployment: Deployment): string {
    // Extract health check URL from deployment configuration
    const config = deployment.targetConfig as any;
    return config.healthCheckUrl || `http://localhost:3000/health`;
  }

  async recordMetric(
    deploymentId: string,
    metric: string,
    value: number,
    unit: string,
  ): Promise<void> {
    await this.prisma.deploymentMetric.create({
      data: {
        deploymentId,
        metric,
        value,
        unit,
        timestamp: new Date(),
      },
    });
  }
}
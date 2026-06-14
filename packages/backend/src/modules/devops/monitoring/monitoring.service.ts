import { Injectable, Logger } from '@nestjs/common';
import { HealthService } from './health.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private healthService: HealthService) {}

  async performHealthCheck(deploymentId: string): Promise<boolean> {
    return await this.healthService.performHealthCheck(deploymentId);
  }
}
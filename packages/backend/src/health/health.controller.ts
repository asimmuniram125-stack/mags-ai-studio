import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthScorerService } from './health-scorer.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly healthScorer: HealthScorerService,
  ) {}

  @Get()
  async check() {
    return this.healthService.check();
  }

  @Get('system')
  async systemHealth() {
    return this.healthScorer.getDetailedHealth();
  }

  @Get('live')
  async liveness() {
    return { status: 'alive', timestamp: Date.now() };
  }

  @Get('ready')
  async readiness() {
    const health = await this.healthService.check();
    return {
      ready: health.status === 'up',
      timestamp: Date.now(),
    };
  }
}

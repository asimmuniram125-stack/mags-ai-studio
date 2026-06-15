import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthScorerService } from './health-scorer.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly healthScorer: HealthScorerService,
  ) {}

  async check() {
    const checks = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
      api: { status: 'healthy', responseTime: 0 },
    };

    const isHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    if (isHealthy) {
      this.healthScorer.updateComponentHealth('database', 'healthy');
      this.healthScorer.updateComponentHealth('cache', 'healthy');
      this.healthScorer.updateComponentHealth('api', 'healthy');
    }

    return {
      status: isHealthy ? 'up' : 'degraded',
      timestamp: Date.now(),
      checks,
      score: this.healthScorer.calculateHealthScore(),
    };
  }

  private async checkDatabase(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.healthScorer.updateComponentHealth('database', 'unhealthy');
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkCache(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.redis.set('health-check', 'ok', 10);
      await this.redis.get('health-check');
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.healthScorer.updateComponentHealth('cache', 'unhealthy');
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
      };
    }
  }
}

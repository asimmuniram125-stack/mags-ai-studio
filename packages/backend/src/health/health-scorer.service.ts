import { Injectable } from '@nestjs/common';

interface HealthComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  weight: number;
  lastCheck: number;
}

@Injectable()
export class HealthScorerService {
  private components: Map<string, HealthComponent> = new Map([
    ['database', { name: 'database', status: 'healthy', weight: 0.25, lastCheck: 0 }],
    ['cache', { name: 'cache', status: 'healthy', weight: 0.15, lastCheck: 0 }],
    ['api', { name: 'api', status: 'healthy', weight: 0.3, lastCheck: 0 }],
    ['websocket', { name: 'websocket', status: 'healthy', weight: 0.15, lastCheck: 0 }],
    ['external-services', { name: 'external-services', status: 'healthy', weight: 0.15, lastCheck: 0 }],
  ]);

  updateComponentHealth(name: string, status: 'healthy' | 'degraded' | 'unhealthy'): void {
    const component = this.components.get(name);
    if (component) {
      component.status = status;
      component.lastCheck = Date.now();
    }
  }

  calculateHealthScore(): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const component of this.components.values()) {
      const componentScore = this.statusToScore(component.status);
      totalScore += componentScore * component.weight;
      totalWeight += component.weight;
    }

    return Math.round((totalScore / totalWeight) * 100);
  }

  getDetailedHealth(): {
    score: number;
    status: string;
    components: HealthComponent[];
    timestamp: number;
  } {
    const score = this.calculateHealthScore();
    let status = 'healthy';

    if (score < 70) status = 'unhealthy';
    else if (score < 85) status = 'degraded';

    return {
      score,
      status,
      components: Array.from(this.components.values()),
      timestamp: Date.now(),
    };
  }

  private statusToScore(status: string): number {
    switch (status) {
      case 'healthy':
        return 100;
      case 'degraded':
        return 50;
      case 'unhealthy':
        return 0;
      default:
        return 50;
    }
  }
}
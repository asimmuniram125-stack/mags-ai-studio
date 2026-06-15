import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface QueryStats {
  duration: number;
  rows: number;
  timestamp: number;
}

@Injectable()
export class QueryOptimizerService {
  private readonly queryStats = new Map<string, QueryStats[]>();
  private readonly slowQueryThreshold = 1000; // 1 second

  constructor(private readonly prisma: PrismaService) {}

  async optimizeQuery<T>(
    queryName: string,
    query: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();

    const result = await query();

    const duration = Date.now() - startTime;
    this.recordQuery(queryName, duration, Array.isArray(result) ? result.length : 1);

    if (duration > this.slowQueryThreshold) {
      console.warn(`SLOW QUERY: ${queryName} took ${duration}ms`);
      await this.logSlowQuery(queryName, duration);
    }

    return result;
  }

  private recordQuery(name: string, duration: number, rows: number): void {
    if (!this.queryStats.has(name)) {
      this.queryStats.set(name, []);
    }

    const stats = this.queryStats.get(name)!;
    stats.push({ duration, rows, timestamp: Date.now() });

    // Keep only last 100 queries
    if (stats.length > 100) {
      stats.shift();
    }
  }

  private async logSlowQuery(queryName: string, duration: number): Promise<void> {
    // Log to monitoring system
    console.error(`Slow query detected: ${queryName} (${duration}ms)`);
  }

  getQueryStats(queryName: string): {
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    totalQueries: number;
  } | null {
    const stats = this.queryStats.get(queryName);
    if (!stats || stats.length === 0) return null;

    const durations = stats.map((s) => s.duration);
    return {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      totalQueries: stats.length,
    };
  }

  getAllQueryStats(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [queryName, stats] of this.queryStats.entries()) {
      if (stats.length === 0) continue;

      const durations = stats.map((s) => s.duration);
      result[queryName] = {
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
        totalQueries: stats.length,
        recentDuration: stats[stats.length - 1].duration,
      };
    }

    return result;
  }

  // Recommendation engine
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    for (const [queryName, stats] of this.queryStats.entries()) {
      if (stats.length === 0) continue;

      const avgDuration = stats.reduce((a, b) => a + b.duration, 0) / stats.length;

      if (avgDuration > this.slowQueryThreshold) {
        recommendations.push(
          `Query "${queryName}" is slow (avg: ${avgDuration.toFixed(0)}ms) - consider indexing or query optimization`,
        );
      }

      // Check for high variance (indicates inconsistent performance)
      const variance =
        stats.reduce(
          (a, b) => a + Math.pow(b.duration - avgDuration, 2),
          0,
        ) / stats.length;
      if (Math.sqrt(variance) > avgDuration * 0.5) {
        recommendations.push(
          `Query "${queryName}" has high variance - consider caching or connection pooling`,
        );
      }
    }

    return recommendations;
  }
}
import { Injectable } from '@nestjs/common';

interface Metric {
  timestamp: number;
  value: number;
}

interface AnomalyResult {
  isAnomaly: boolean;
  deviation: number;
  confidence: number;
  expectedValue: number;
}

@Injectable()
export class AnomalyDetectionService {
  private metrics = new Map<string, Metric[]>();
  private readonly windowSize = 100; // Consider last 100 metrics
  private readonly stdDevThreshold = 3; // 3 standard deviations

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsArray = this.metrics.get(name)!;
    metricsArray.push({ timestamp: Date.now(), value });

    // Keep only last windowSize metrics
    if (metricsArray.length > this.windowSize) {
      metricsArray.shift();
    }
  }

  detectAnomaly(name: string, currentValue: number): AnomalyResult {
    const metricsArray = this.metrics.get(name);

    if (!metricsArray || metricsArray.length < 10) {
      return {
        isAnomaly: false,
        deviation: 0,
        confidence: 0,
        expectedValue: currentValue,
      };
    }

    const values = metricsArray.map((m) => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const deviation = Math.abs(currentValue - mean) / (stdDev || 1);
    const isAnomaly = deviation > this.stdDevThreshold;
    const confidence = Math.min(1, deviation / (this.stdDevThreshold * 2));

    return {
      isAnomaly,
      deviation,
      confidence,
      expectedValue: mean,
    };
  }

  getMetricStatistics(name: string): {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const metricsArray = this.metrics.get(name);
    if (!metricsArray || metricsArray.length === 0) return null;

    const values = metricsArray.map((m) => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }
}
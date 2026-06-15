import { Injectable } from '@nestjs/common';

interface FailurePattern {
  service: string;
  errorCount: number;
  lastError: Error;
  timestamp: number;
}

@Injectable()
export class AutoDetectionService {
  private failurePatterns = new Map<string, FailurePattern>();
  private readonly failureThreshold = 5; // 5 errors in window
  private readonly detectionWindow = 60000; // 1 minute

  async detectFailingService(serviceName: string): Promise<boolean> {
    const pattern = this.failurePatterns.get(serviceName);

    if (!pattern) return false;

    const timeSinceLastError = Date.now() - pattern.timestamp;
    if (timeSinceLastError > this.detectionWindow) {
      this.failurePatterns.delete(serviceName);
      return false;
    }

    return pattern.errorCount >= this.failureThreshold;
  }

  recordError(serviceName: string, error: Error): void {
    const pattern = this.failurePatterns.get(serviceName) || {
      service: serviceName,
      errorCount: 0,
      lastError: error,
      timestamp: Date.now(),
    };

    pattern.errorCount++;
    pattern.lastError = error;
    pattern.timestamp = Date.now();

    this.failurePatterns.set(serviceName, pattern);
  }

  getFailureReport(): FailurePattern[] {
    return Array.from(this.failurePatterns.values());
  }
}

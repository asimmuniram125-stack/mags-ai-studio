import { Injectable } from '@nestjs/common';

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{ timestamp: number; message: string }>;
  status: 'success' | 'error' | 'pending';
}

@Injectable()
export class DistributedTracingService {
  private spans = new Map<string, Span[]>();
  private readonly maxSpansPerTrace = 1000;

  createSpan(
    operation: string,
    traceId?: string,
    parentSpanId?: string,
  ): { traceId: string; spanId: string } {
    const spanTraceId = traceId || this.generateTraceId();
    const spanId = this.generateSpanId();

    const span: Span = {
      traceId: spanTraceId,
      spanId,
      parentSpanId,
      operation,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'pending',
    };

    if (!this.spans.has(spanTraceId)) {
      this.spans.set(spanTraceId, []);
    }

    const traceSpans = this.spans.get(spanTraceId)!;
    if (traceSpans.length < this.maxSpansPerTrace) {
      traceSpans.push(span);
    }

    return { traceId: spanTraceId, spanId };
  }

  finishSpan(traceId: string, spanId: string, status: 'success' | 'error' = 'success'): void {
    const spans = this.spans.get(traceId);
    if (!spans) return;

    const span = spans.find((s) => s.spanId === spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.status = status;
    }
  }

  addSpanTag(traceId: string, spanId: string, key: string, value: any): void {
    const spans = this.spans.get(traceId);
    if (!spans) return;

    const span = spans.find((s) => s.spanId === spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  addSpanLog(traceId: string, spanId: string, message: string): void {
    const spans = this.spans.get(traceId);
    if (!spans) return;

    const span = spans.find((s) => s.spanId === spanId);
    if (span) {
      span.logs.push({ timestamp: Date.now(), message });
    }
  }

  getTrace(traceId: string): Span[] | null {
    return this.spans.get(traceId) || null;
  }

  getTraceMetrics(traceId: string): {
    totalDuration: number;
    spansCount: number;
    avgSpanDuration: number;
    errors: number;
  } | null {
    const spans = this.spans.get(traceId);
    if (!spans || spans.length === 0) return null;

    const totalDuration =
      (Math.max(...spans.map((s) => s.endTime || 0)) || 0) -
      Math.min(...spans.map((s) => s.startTime));
    const completedSpans = spans.filter((s) => s.endTime);
    const avgSpanDuration =
      completedSpans.length > 0
        ? completedSpans.reduce((sum, s) => sum + (s.duration || 0), 0) /
          completedSpans.length
        : 0;
    const errors = spans.filter((s) => s.status === 'error').length;

    return {
      totalDuration,
      spansCount: spans.length,
      avgSpanDuration,
      errors,
    };
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateSpanId(): string {
    return `span_${Math.random().toString(36).substring(7)}`;
  }
}
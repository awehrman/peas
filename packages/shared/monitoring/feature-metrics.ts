/**
 * Feature-specific metrics tracking
 */


export interface FeatureMetrics {
  featureName: string;
  operationCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastOperationTime: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureMetricsConfig {
  trackErrors: boolean;
  trackPerformance: boolean;
  trackUsage: boolean;
  retentionPeriod: number; // in milliseconds
}

export interface FeatureMetricEvent {
  type: "operation" | "error" | "usage";
  featureName: string;
  operation: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export class FeatureMetricsTracker {
  private metrics: Map<string, FeatureMetrics> = new Map();
  private events: FeatureMetricEvent[] = [];
  private config: FeatureMetricsConfig;

  constructor(config: Partial<FeatureMetricsConfig> = {}) {
    this.config = {
      trackErrors: true,
      trackPerformance: true,
      trackUsage: true,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      ...config,
    };
  }

  recordOperation(
    featureName: string,
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    const key = `${featureName}_${operation}`;
    const existing =
      this.metrics.get(key) || this.createEmptyMetrics(featureName, operation);

    existing.operationCount++;
    if (!success) {
      existing.errorCount++;
    }

    // Update average response time
    const totalTime =
      existing.averageResponseTime * (existing.operationCount - 1) + duration;
    existing.averageResponseTime = totalTime / existing.operationCount;

    existing.lastOperationTime = new Date().toISOString();
    existing.metadata = { ...existing.metadata, ...metadata };

    this.metrics.set(key, existing);

    // Record event
    if (this.config.trackPerformance) {
      this.events.push({
        type: "operation",
        featureName,
        operation,
        timestamp: new Date().toISOString(),
        data: {
          duration,
          success,
          ...metadata,
        },
      });
    }

    this.cleanupOldEvents();
  }

  recordError(
    featureName: string,
    operation: string,
    error: unknown,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.trackErrors) return;

    const key = `${featureName}_${operation}`;
    const existing =
      this.metrics.get(key) || this.createEmptyMetrics(featureName, operation);

    existing.errorCount++;
    existing.lastOperationTime = new Date().toISOString();
    existing.metadata = { ...existing.metadata, ...metadata };

    this.metrics.set(key, existing);

    // Record error event
    this.events.push({
      type: "error",
      featureName,
      operation,
      timestamp: new Date().toISOString(),
      data: {
        error: error instanceof Error ? error.message : String(error),
        ...metadata,
      },
    });

    this.cleanupOldEvents();
  }

  recordUsage(
    featureName: string,
    operation: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.trackUsage) return;

    this.events.push({
      type: "usage",
      featureName,
      operation,
      timestamp: new Date().toISOString(),
      data: metadata || {},
    });

    this.cleanupOldEvents();
  }

  getMetrics(featureName?: string): FeatureMetrics[] {
    const metrics = Array.from(this.metrics.values());

    if (featureName) {
      return metrics.filter((m) => m.featureName === featureName);
    }

    return metrics;
  }

  getFeatureMetrics(featureName: string): FeatureMetrics | null {
    // Get the most recent metrics for the feature
    const metrics = this.getMetrics(featureName);
    if (metrics.length === 0) return null;

    // Combine all operations for the feature
    const combined: FeatureMetrics = {
      featureName,
      operationCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastOperationTime: "",
      metadata: {},
    };

    metrics.forEach((metric) => {
      combined.operationCount += metric.operationCount;
      combined.errorCount += metric.errorCount;

      // Weighted average of response times
      const weight = metric.operationCount / combined.operationCount;
      combined.averageResponseTime += metric.averageResponseTime * weight;

      // Most recent operation time
      if (metric.lastOperationTime > combined.lastOperationTime) {
        combined.lastOperationTime = metric.lastOperationTime;
      }

      // Merge metadata
      combined.metadata = { ...combined.metadata, ...metric.metadata };
    });

    return combined;
  }

  getEvents(filter?: {
    featureName?: string;
    operation?: string;
    type?: "operation" | "error" | "usage";
    since?: Date;
  }): FeatureMetricEvent[] {
    let filtered = this.events;

    if (filter?.featureName) {
      filtered = filtered.filter((e) => e.featureName === filter.featureName);
    }

    if (filter?.operation) {
      filtered = filtered.filter((e) => e.operation === filter.operation);
    }

    if (filter?.type) {
      filtered = filtered.filter((e) => e.type === filter.type);
    }

    if (filter?.since) {
      filtered = filtered.filter((e) => new Date(e.timestamp) >= filter.since!);
    }

    return filtered;
  }

  getErrorRate(featureName: string): number {
    const metrics = this.getFeatureMetrics(featureName);
    if (!metrics || metrics.operationCount === 0) return 0;

    return metrics.errorCount / metrics.operationCount;
  }

  getSuccessRate(featureName: string): number {
    return 1 - this.getErrorRate(featureName);
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.events = [];
  }

  cleanupOldEvents(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.events = this.events.filter(
      (event) => new Date(event.timestamp).getTime() > cutoff
    );
  }

  getEventCount(): number {
    return this.events.length;
  }

  private createEmptyMetrics(
    featureName: string,
    operation: string
  ): FeatureMetrics {
    return {
      featureName: `${featureName}_${operation}`,
      operationCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastOperationTime: new Date().toISOString(),
      metadata: {},
    };
  }
}

export function createFeatureMetricsTracker(
  config?: Partial<FeatureMetricsConfig>
): FeatureMetricsTracker {
  return new FeatureMetricsTracker(config);
}

export function trackFeatureOperation(
  tracker: FeatureMetricsTracker,
  featureName: string,
  operation: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  tracker.recordOperation(featureName, operation, duration, success, metadata);
}

export function trackFeatureError(
  tracker: FeatureMetricsTracker,
  featureName: string,
  operation: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  tracker.recordError(featureName, operation, error, metadata);
}

export function trackFeatureUsage(
  tracker: FeatureMetricsTracker,
  featureName: string,
  operation: string,
  metadata?: Record<string, unknown>
): void {
  tracker.recordUsage(featureName, operation, metadata);
}

// Global tracker instance
let globalTracker: FeatureMetricsTracker | null = null;

export function getGlobalFeatureMetricsTracker(): FeatureMetricsTracker {
  if (!globalTracker) {
    globalTracker = new FeatureMetricsTracker();
  }
  return globalTracker;
}

export function setGlobalFeatureMetricsTracker(
  tracker: FeatureMetricsTracker
): void {
  globalTracker = tracker;
}

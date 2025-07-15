/**
 * Metrics collection for worker monitoring
 */
export interface MetricValue {
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: "counter" | "gauge" | "histogram";
  values: MetricValue[];
  description?: string;
}

/**
 * Simple metrics collector
 */
export class MetricsCollector {
  private metrics = new Map<string, Metric>();

  /**
   * Increment a counter metric
   */
  increment(
    name: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    const metric = this.getOrCreateMetric(name, "counter");
    metric.values.push({
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Set a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, "gauge");
    metric.values.push({
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const metric = this.getOrCreateMetric(name, "histogram");
    metric.values.push({
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Get or create a metric
   */
  private getOrCreateMetric(name: string, type: Metric["type"]): Metric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        values: [],
      });
    }
    return this.metrics.get(name)!;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear old metrics (keep last N values)
   */
  clearOldMetrics(maxValues: number = 100): void {
    for (const metric of this.metrics.values()) {
      if (metric.values.length > maxValues) {
        metric.values = metric.values.slice(-maxValues);
      }
    }
  }

  /**
   * Get summary statistics for a metric
   */
  getMetricSummary(name: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    const metric = this.metrics.get(name);
    if (!metric || metric.values.length === 0) {
      return null;
    }

    const values = metric.values.map((v) => v.value);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1] || 0,
    };
  }
}

/**
 * Global metrics collector
 */
export const globalMetrics = new MetricsCollector();

/**
 * Helper functions for common metrics
 */
export class WorkerMetrics {
  /**
   * Record job processing time
   */
  static recordJobProcessingTime(
    operation: string,
    durationMs: number,
    success: boolean
  ): void {
    globalMetrics.histogram("worker.job.processing_time", durationMs, {
      operation,
    });
    globalMetrics.increment("worker.job.total", 1, { operation });
    globalMetrics.increment("worker.job.success", success ? 1 : 0, {
      operation,
    });
    globalMetrics.increment("worker.job.failure", success ? 0 : 1, {
      operation,
    });
  }

  /**
   * Record action execution time
   */
  static recordActionExecutionTime(
    actionName: string,
    durationMs: number,
    success: boolean
  ): void {
    globalMetrics.histogram("worker.action.execution_time", durationMs, {
      action: actionName,
    });
    globalMetrics.increment("worker.action.total", 1, { action: actionName });
    globalMetrics.increment("worker.action.success", success ? 1 : 0, {
      action: actionName,
    });
    globalMetrics.increment("worker.action.failure", success ? 0 : 1, {
      action: actionName,
    });
  }

  /**
   * Record queue depth
   */
  static recordQueueDepth(queueName: string, depth: number): void {
    globalMetrics.gauge("worker.queue.depth", depth, { queue: queueName });
  }

  /**
   * Record worker status
   */
  static recordWorkerStatus(workerName: string, isRunning: boolean): void {
    globalMetrics.gauge("worker.status", isRunning ? 1 : 0, {
      worker: workerName,
    });
  }
}

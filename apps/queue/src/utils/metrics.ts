import { EventEmitter } from "events";
import { setImmediate } from "timers";

// ============================================================================
// METRICS INTERFACES
// ============================================================================

export interface MetricValue {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  description: string;
  values: MetricValue[];
  labels?: Record<string, string>;
}

export interface MetricsSnapshot {
  timestamp: Date;
  metrics: Record<string, Metric>;
  summary: {
    totalMetrics: number;
    totalValues: number;
    oldestValue: Date;
    newestValue: Date;
  };
}

export interface PerformanceMetrics {
  requestCount: number;
  requestDuration: number;
  errorCount: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  queueSize: number;
  cacheHitRate: number;
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private metrics: Map<string, Metric> = new Map();
  private collectionInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_VALUES_PER_METRIC = 1000;
  private readonly COLLECTION_INTERVAL_MS = 30000; // 30 seconds

  private constructor() {
    super();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // ============================================================================
  // METRIC MANAGEMENT
  // ============================================================================

  public recordCounter(
    name: string,
    value: number = 1,
    labels?: Record<string, string>
  ): void {
    this.recordMetric(name, "counter", value, labels);
  }

  public recordGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.recordMetric(name, "gauge", value, labels);
  }

  public recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.recordMetric(name, "histogram", value, labels);
  }

  public recordSummary(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.recordMetric(name, "summary", value, labels);
  }

  private recordMetric(
    name: string,
    type: Metric["type"],
    value: number,
    labels?: Record<string, string>
  ): void {
    const metricKey = this.getMetricKey(name, labels);

    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, {
        name,
        type,
        description: `Auto-generated metric for ${name}`,
        values: [],
        labels,
      });
    }

    const metric = this.metrics.get(metricKey)!;
    const metricValue: MetricValue = {
      value,
      timestamp: new Date(),
      labels,
    };

    metric.values.push(metricValue);

    // Keep only the latest values
    if (metric.values.length > this.MAX_VALUES_PER_METRIC) {
      metric.values = metric.values.slice(-this.MAX_VALUES_PER_METRIC);
    }

    // Emit metric recorded event
    this.emit("metricRecorded", { name, type, value, labels });
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;

    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");

    return `${name}{${labelString}}`;
  }

  // ============================================================================
  // METRIC QUERIES
  // ============================================================================

  public getMetric(
    name: string,
    labels?: Record<string, string>
  ): Metric | undefined {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key);
  }

  public getMetricsByPrefix(prefix: string): Metric[] {
    return Array.from(this.metrics.values()).filter((metric) =>
      metric.name.startsWith(prefix)
    );
  }

  public getLatestValue(
    name: string,
    labels?: Record<string, string>
  ): number | undefined {
    const metric = this.getMetric(name, labels);
    return metric?.values[metric.values.length - 1]?.value;
  }

  public getAverageValue(
    name: string,
    labels?: Record<string, string>,
    windowMs?: number
  ): number | undefined {
    const metric = this.getMetric(name, labels);
    if (!metric || metric.values.length === 0) return undefined;

    let values = metric.values;

    if (windowMs) {
      const cutoff = new Date(Date.now() - windowMs);
      values = values.filter((v) => v.timestamp >= cutoff);
    }

    if (values.length === 0) return undefined;

    const sum = values.reduce((acc, v) => acc + v.value, 0);
    return sum / values.length;
  }

  // ============================================================================
  // SYSTEM METRICS
  // ============================================================================

  public async collectSystemMetrics(): Promise<void> {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.recordGauge("memory_heap_used", memUsage.heapUsed);
      this.recordGauge("memory_heap_total", memUsage.heapTotal);
      this.recordGauge("memory_external", memUsage.external);
      this.recordGauge("memory_rss", memUsage.rss);

      // CPU usage (approximate)
      const startUsage = process.cpuUsage();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);

      const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
      this.recordGauge("cpu_usage", cpuPercent);

      // Uptime
      this.recordGauge("uptime_seconds", process.uptime());

      // Event loop lag
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        this.recordHistogram("event_loop_lag_ms", lag);
      });
    } catch (error) {
      console.error("Failed to collect system metrics:", error);
    }
  }

  // ============================================================================
  // APPLICATION METRICS
  // ============================================================================

  public recordRequestMetrics(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ): void {
    this.recordCounter("http_requests_total", 1, {
      method,
      path,
      status: statusCode.toString(),
    });
    this.recordHistogram("http_request_duration_ms", duration, {
      method,
      path,
    });

    if (statusCode >= 400) {
      this.recordCounter("http_errors_total", 1, {
        method,
        path,
        status: statusCode.toString(),
      });
    }
  }

  public recordQueueMetrics(
    queueName: string,
    jobCount: number,
    status: string
  ): void {
    this.recordGauge("queue_jobs", jobCount, { queue: queueName, status });
  }

  public recordDatabaseMetrics(
    operation: string,
    duration: number,
    success: boolean
  ): void {
    this.recordHistogram("database_operation_duration_ms", duration, {
      operation,
    });
    this.recordCounter("database_operations_total", 1, {
      operation,
      success: success.toString(),
    });
  }

  public recordCacheMetrics(operation: string, hit: boolean): void {
    this.recordCounter("cache_operations_total", 1, {
      operation,
      hit: hit.toString(),
    });
  }

  // ============================================================================
  // METRICS EXPORT
  // ============================================================================

  public getSnapshot(): MetricsSnapshot {
    const metrics = Object.fromEntries(this.metrics);
    const allValues = Array.from(this.metrics.values()).flatMap(
      (m) => m.values
    );

    const timestamps = allValues.map((v) => v.timestamp.getTime());
    const oldestValue = new Date(Math.min(...timestamps));
    const newestValue = new Date(Math.max(...timestamps));

    return {
      timestamp: new Date(),
      metrics,
      summary: {
        totalMetrics: this.metrics.size,
        totalValues: allValues.length,
        oldestValue,
        newestValue,
      },
    };
  }

  public getPrometheusFormat(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      // Add metric help
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Add metric values
      for (const value of metric.values.slice(-10)) {
        // Last 10 values
        const labelString = metric.labels
          ? `{${Object.entries(metric.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(",")}}`
          : "";

        lines.push(
          `${metric.name}${labelString} ${value.value} ${value.timestamp.getTime()}`
        );
      }
    }

    return lines.join("\n");
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return {
      requestCount: this.getLatestValue("http_requests_total") || 0,
      requestDuration:
        this.getAverageValue("http_request_duration_ms", undefined, 60000) || 0,
      errorCount: this.getLatestValue("http_errors_total") || 0,
      activeConnections: this.getLatestValue("active_connections") || 0,
      memoryUsage: this.getLatestValue("memory_heap_used") || 0,
      cpuUsage: this.getLatestValue("cpu_usage") || 0,
      queueSize: this.getLatestValue("queue_jobs") || 0,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  private calculateCacheHitRate(): number {
    const hits =
      this.getLatestValue("cache_operations_total", { hit: "true" }) || 0;
    const total = this.getLatestValue("cache_operations_total") || 0;

    return total > 0 ? (hits / total) * 100 : 0;
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  public startCollection(): void {
    if (this.collectionInterval) {
      this.stopCollection();
    }

    this.collectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      this.emit("metricsCollected", this.getSnapshot());
    }, this.COLLECTION_INTERVAL_MS);

    console.log("📊 Metrics collection started");
  }

  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      console.log("🛑 Metrics collection stopped");
    }
  }

  // ============================================================================
  // METRICS CLEANUP
  // ============================================================================

  public clearOldMetrics(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    // Default: 24 hours
    const cutoff = new Date(Date.now() - olderThanMs);
    let clearedCount = 0;

    for (const metric of this.metrics.values()) {
      const originalLength = metric.values.length;
      metric.values = metric.values.filter((v) => v.timestamp >= cutoff);
      clearedCount += originalLength - metric.values.length;
    }

    console.log(`🧹 Cleared ${clearedCount} old metric values`);
  }

  public reset(): void {
    this.metrics.clear();
    console.log("🔄 Metrics reset");
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE (DEPRECATED - Use ManagerFactory instead)
// ============================================================================

// @deprecated Use ManagerFactory.createMetricsCollector() instead
export const metricsCollector = MetricsCollector.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number
): void {
  metricsCollector.recordRequestMetrics(method, path, statusCode, duration);
}

export function recordQueueJob(
  queueName: string,
  jobCount: number,
  status: string
): void {
  metricsCollector.recordQueueMetrics(queueName, jobCount, status);
}

export function recordDatabaseOperation(
  operation: string,
  duration: number,
  success: boolean
): void {
  metricsCollector.recordDatabaseMetrics(operation, duration, success);
}

export function recordCacheOperation(operation: string, hit: boolean): void {
  metricsCollector.recordCacheMetrics(operation, hit);
}

export function getMetricsSnapshot(): MetricsSnapshot {
  return metricsCollector.getSnapshot();
}

export function getPrometheusMetrics(): string {
  return metricsCollector.getPrometheusFormat();
}

export function getPerformanceMetrics(): PerformanceMetrics {
  return metricsCollector.getPerformanceMetrics();
}

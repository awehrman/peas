/**
 * Performance monitoring system for features
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  featureName: string;
  operation: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceThreshold {
  warning: number;
  error: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of operations to monitor
  thresholds?: Record<string, PerformanceThreshold>;
  onMetric?: (metric: PerformanceMetric) => void;
  onThresholdExceeded?: (metric: PerformanceMetric, threshold: PerformanceThreshold) => void;
}

export interface TimerOptions {
  featureName: string;
  operation: string;
  metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, { start: number; options: TimerOptions }> = new Map();

  constructor(config: PerformanceConfig = { enabled: true, sampleRate: 1.0 }) {
    this.config = config;
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  configure(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  startTimer(id: string, options: TimerOptions): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    this.timers.set(id, {
      start: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
      options
    });
  }

  endTimer(id: string, additionalMetadata?: Record<string, unknown>): PerformanceMetric | null {
    const timer = this.timers.get(id);
    if (!timer) {
      return null;
    }

    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - timer.start;
    this.timers.delete(id);

    const metric: PerformanceMetric = {
      name: `${timer.options.operation}_duration`,
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      featureName: timer.options.featureName,
      operation: timer.options.operation,
      metadata: {
        ...timer.options.metadata,
        ...additionalMetadata
      }
    };

    this.recordMetric(metric);
    return metric;
  }

  recordMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) {
      return;
    }

    this.metrics.push(metric);

    // Check thresholds
    const threshold = this.config.thresholds?.[metric.name];
    if (threshold && metric.value > threshold.error) {
      this.config.onThresholdExceeded?.(metric, threshold);
    }

    // Call metric handler
    this.config.onMetric?.(metric);
  }

  measure<T>(options: TimerOptions, operation: () => T): T {
    const id = `${options.featureName}_${options.operation}_${Date.now()}`;
    this.startTimer(id, options);
    
    try {
      const result = operation();
      this.endTimer(id);
      return result;
    } catch (error) {
      this.endTimer(id, { error: true });
      throw error;
    }
  }

  async measureAsync<T>(options: TimerOptions, operation: () => Promise<T>): Promise<T> {
    const id = `${options.featureName}_${options.operation}_${Date.now()}`;
    this.startTimer(id, options);
    
    try {
      const result = await operation();
      this.endTimer(id);
      return result;
    } catch (error) {
      this.endTimer(id, { error: true });
      throw error;
    }
  }

  getMetrics(
    filter?: {
      featureName?: string;
      operation?: string;
      since?: Date;
    }
  ): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filter?.featureName) {
      filtered = filtered.filter(m => m.featureName === filter.featureName);
    }

    if (filter?.operation) {
      filtered = filtered.filter(m => m.operation === filter.operation);
    }

    if (filter?.since) {
      filtered = filtered.filter(m => new Date(m.timestamp) >= filter.since!);
    }

    return filtered;
  }

  getAverageMetric(
    metricName: string,
    filter?: {
      featureName?: string;
      operation?: string;
      since?: Date;
    }
  ): number | null {
    const metrics = this.getMetrics(filter).filter(m => m.name === metricName);
    
    if (metrics.length === 0) {
      return null;
    }

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getTimerCount(): number {
    return this.timers.size;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export function createPerformanceMonitor(config?: PerformanceConfig): PerformanceMonitor {
  return new PerformanceMonitor(config);
}

export function measure<T>(
  options: TimerOptions,
  operation: () => T
): T {
  return PerformanceMonitor.getInstance().measure(options, operation);
}

export function measureAsync<T>(
  options: TimerOptions,
  operation: () => Promise<T>
): Promise<T> {
  return PerformanceMonitor.getInstance().measureAsync(options, operation);
}

export function startTimer(id: string, options: TimerOptions): void {
  PerformanceMonitor.getInstance().startTimer(id, options);
}

export function endTimer(id: string, additionalMetadata?: Record<string, unknown>): PerformanceMetric | null {
  return PerformanceMonitor.getInstance().endTimer(id, additionalMetadata);
}

export function recordMetric(metric: PerformanceMetric): void {
  PerformanceMonitor.getInstance().recordMetric(metric);
}

export function getPerformanceMonitor(): PerformanceMonitor {
  return PerformanceMonitor.getInstance();
}

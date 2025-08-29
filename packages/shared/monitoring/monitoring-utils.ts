/**
 * Utility functions for monitoring features
 */

import { PerformanceMonitor, type PerformanceMetric } from './performance-monitor';
import { FeatureMetricsTracker, type FeatureMetrics, type FeatureMetricEvent } from './feature-metrics';

export interface MonitoringConfig {
  performance: {
    enabled: boolean;
    sampleRate: number;
    thresholds?: Record<string, { warning: number; error: number }>;
  };
  metrics: {
    enabled: boolean;
    trackErrors: boolean;
    trackPerformance: boolean;
    trackUsage: boolean;
    retentionPeriod: number;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface MonitoringContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export class FeatureMonitor {
  private performanceMonitor: PerformanceMonitor;
  private metricsTracker: FeatureMetricsTracker;
  private config: MonitoringConfig;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      performance: {
        enabled: true,
        sampleRate: 1.0,
        ...config.performance
      },
      metrics: {
        enabled: true,
        trackErrors: true,
        trackPerformance: true,
        trackUsage: true,
        retentionPeriod: 24 * 60 * 60 * 1000,
        ...config.metrics
      },
      logging: {
        enabled: true,
        level: 'info',
        ...config.logging
      }
    };

    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.performanceMonitor.configure(this.config.performance);
    
    this.metricsTracker = new FeatureMetricsTracker(this.config.metrics);
  }

  withMonitoring<T>(
    context: MonitoringContext,
    operation: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const timerId = `${context.featureName}_${context.operation}_${Date.now()}`;
    
    if (this.config.performance.enabled) {
      this.performanceMonitor.startTimer(timerId, {
        featureName: context.featureName,
        operation: context.operation,
        metadata: { ...context, ...metadata }
      });
    }

    try {
      const result = operation();
      this.recordSuccess(context, metadata);
      return result;
    } catch (error) {
      this.recordError(context, error, metadata);
      throw error;
    } finally {
      if (this.config.performance.enabled) {
        this.performanceMonitor.endTimer(timerId);
      }
    }
  }

  async withMonitoringAsync<T>(
    context: MonitoringContext,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const timerId = `${context.featureName}_${context.operation}_${Date.now()}`;
    
    if (this.config.performance.enabled) {
      this.performanceMonitor.startTimer(timerId, {
        featureName: context.featureName,
        operation: context.operation,
        metadata: { ...context, ...metadata }
      });
    }

    try {
      const result = await operation();
      this.recordSuccess(context, metadata);
      return result;
    } catch (error) {
      this.recordError(context, error, metadata);
      throw error;
    } finally {
      if (this.config.performance.enabled) {
        this.performanceMonitor.endTimer(timerId);
      }
    }
  }

  recordSuccess(context: MonitoringContext, metadata?: Record<string, unknown>): void {
    if (this.config.metrics.enabled) {
      this.metricsTracker.recordOperation(
        context.featureName,
        context.operation,
        0, // Duration will be calculated by performance monitor
        true,
        { ...context, ...metadata }
      );
    }

    this.log('info', `Operation completed: ${context.operation}`, { context, metadata });
  }

  recordError(context: MonitoringContext, error: unknown, metadata?: Record<string, unknown>): void {
    if (this.config.metrics.enabled) {
      this.metricsTracker.recordError(
        context.featureName,
        context.operation,
        error,
        { ...context, ...metadata }
      );
    }

    this.log('error', `Operation failed: ${context.operation}`, { context, metadata, error });
  }

  recordUsage(context: MonitoringContext, metadata?: Record<string, unknown>): void {
    if (this.config.metrics.enabled) {
      this.metricsTracker.recordUsage(
        context.featureName,
        context.operation,
        { ...context, ...metadata }
      );
    }

    this.log('info', `Usage recorded: ${context.operation}`, { context, metadata });
  }

  getPerformanceMetrics(filter?: {
    featureName?: string;
    operation?: string;
    since?: Date;
  }): PerformanceMetric[] {
    return this.performanceMonitor.getMetrics(filter);
  }

  getFeatureMetrics(featureName: string): FeatureMetrics | null {
    return this.metricsTracker.getFeatureMetrics(featureName);
  }

  getErrorRate(featureName: string): number {
    return this.metricsTracker.getErrorRate(featureName);
  }

  getSuccessRate(featureName: string): number {
    return this.metricsTracker.getSuccessRate(featureName);
  }

  getEvents(filter?: {
    featureName?: string;
    operation?: string;
    type?: 'operation' | 'error' | 'usage';
    since?: Date;
  }): FeatureMetricEvent[] {
    return this.metricsTracker.getEvents(filter);
  }

  clearMetrics(): void {
    this.performanceMonitor.clearMetrics();
    this.metricsTracker.clearMetrics();
  }

  private log(level: string, message: string, data?: Record<string, unknown>): void {
    if (!this.config.logging.enabled) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level as keyof typeof levels] < levels[this.config.logging.level]) return;

    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };

    switch (level) {
      case 'debug':
        console.debug('[FeatureMonitor]', logData);
        break;
      case 'info':
        console.info('[FeatureMonitor]', logData);
        break;
      case 'warn':
        console.warn('[FeatureMonitor]', logData);
        break;
      case 'error':
        console.error('[FeatureMonitor]', logData);
        break;
    }
  }
}

export function createFeatureMonitor(config?: Partial<MonitoringConfig>): FeatureMonitor {
  return new FeatureMonitor(config);
}

export function withFeatureMonitoring<T>(
  context: MonitoringContext,
  operation: () => T,
  metadata?: Record<string, unknown>
): T {
  const monitor = new FeatureMonitor();
  return monitor.withMonitoring(context, operation, metadata);
}

export function withFeatureMonitoringAsync<T>(
  context: MonitoringContext,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const monitor = new FeatureMonitor();
  return monitor.withMonitoringAsync(context, operation, metadata);
}

// Global monitor instance
let globalMonitor: FeatureMonitor | null = null;

export function getGlobalFeatureMonitor(): FeatureMonitor {
  if (!globalMonitor) {
    globalMonitor = new FeatureMonitor();
  }
  return globalMonitor;
}

export function setGlobalFeatureMonitor(monitor: FeatureMonitor): void {
  globalMonitor = monitor;
}

export const monitoringUtils = {
  createFeatureMonitor,
  withFeatureMonitoring,
  withFeatureMonitoringAsync,
  getGlobalFeatureMonitor,
  setGlobalFeatureMonitor
};

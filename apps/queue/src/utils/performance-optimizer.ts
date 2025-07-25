import { createLogger } from "./standardized-logger";

import { configManager } from "../config/configuration-manager";

// ============================================================================
// PERFORMANCE OPTIMIZER
// ============================================================================

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: Date;
  context?: Record<string, unknown>;
}

/**
 * Performance optimization options
 */
export interface PerformanceOptions {
  enableProfiling: boolean;
  enableMemoryTracking: boolean;
  enableCpuTracking: boolean;
  slowOperationThreshold: number; // milliseconds
  memoryThreshold: number; // bytes
  maxMetricsHistory: number;
}

/**
 * Performance optimization result
 */
export interface OptimizationResult {
  optimized: boolean;
  improvements: string[];
  metrics: PerformanceMetrics;
  recommendations: string[];
}

/**
 * Database query optimization result
 */
export interface QueryOptimizationResult {
  query: string;
  originalDuration: number;
  optimizedDuration?: number;
  improvement?: number;
  recommendations: string[];
}

/**
 * Cache optimization result
 */
export interface CacheOptimizationResult {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  recommendations: string[];
}

/**
 * Performance optimizer class
 */
export class PerformanceOptimizer {
  private logger = createLogger("PerformanceOptimizer");
  private metrics: PerformanceMetrics[] = [];
  private options: PerformanceOptions;
  private isProfiling = false;

  constructor(options: Partial<PerformanceOptions> = {}) {
    const config = configManager.getConfig();
    this.options = {
      enableProfiling: config.monitoring.enabled,
      enableMemoryTracking: true,
      enableCpuTracking: true,
      slowOperationThreshold: 1000, // 1 second
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      maxMetricsHistory: 1000,
      ...options,
    };
  }

  /**
   * Profile an async operation
   */
  async profile<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    if (!this.options.enableProfiling) {
      return fn();
    }

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    try {
      const result = await fn();
      return result;
    } finally {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      const endCpu = process.cpuUsage();

      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryUsage = endMemory.heapUsed - startMemory.heapUsed;
      const cpuUsage =
        endCpu.user + endCpu.system - (startCpu.user + startCpu.system);

      const metrics: PerformanceMetrics = {
        operation,
        duration,
        memoryUsage,
        cpuUsage,
        timestamp: new Date(),
        context,
      };

      this.recordMetrics(metrics);
      this.checkPerformanceThresholds(metrics);
    }
  }

  /**
   * Profile a synchronous operation
   */
  profileSync<T>(
    operation: string,
    fn: () => T,
    context?: Record<string, unknown>
  ): T {
    if (!this.options.enableProfiling) {
      return fn();
    }

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    try {
      const result = fn();
      return result;
    } finally {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      const endCpu = process.cpuUsage();

      const duration = Number(endTime - startTime) / 1000000;
      const memoryUsage = endMemory.heapUsed - startMemory.heapUsed;
      const cpuUsage =
        endCpu.user + endCpu.system - (startCpu.user + startCpu.system);

      const metrics: PerformanceMetrics = {
        operation,
        duration,
        memoryUsage,
        cpuUsage,
        timestamp: new Date(),
        context,
      };

      this.recordMetrics(metrics);
      this.checkPerformanceThresholds(metrics);
    }
  }

  /**
   * Optimize database queries
   */
  optimizeDatabaseQueries(queries: string[]): QueryOptimizationResult[] {
    const results: QueryOptimizationResult[] = [];

    for (const query of queries) {
      const recommendations: string[] = [];
      let optimizedDuration: number | undefined;

      // Check for common optimization patterns
      if (query.toLowerCase().includes("select *")) {
        recommendations.push("Use specific column names instead of SELECT *");
      }

      if (
        query.toLowerCase().includes("order by") &&
        !query.toLowerCase().includes("limit")
      ) {
        recommendations.push("Add LIMIT clause to ORDER BY queries");
      }

      if (
        query.toLowerCase().includes("like '%") &&
        query.toLowerCase().includes("%'")
      ) {
        recommendations.push("Avoid leading wildcards in LIKE queries");
      }

      if (
        query.toLowerCase().includes("or") &&
        query.toLowerCase().includes("where")
      ) {
        recommendations.push(
          "Consider using UNION instead of OR for better performance"
        );
      }

      if (
        query.toLowerCase().includes("group by") &&
        !query.toLowerCase().includes("having")
      ) {
        recommendations.push(
          "Consider adding HAVING clause for better filtering"
        );
      }

      // Estimate improvement (this is a simplified estimation)
      if (recommendations.length > 0) {
        optimizedDuration = Math.max(10, Math.floor(Math.random() * 100)); // Placeholder
      }

      results.push({
        query,
        originalDuration: Math.floor(Math.random() * 500) + 50, // Placeholder
        optimizedDuration,
        improvement: optimizedDuration
          ? Math.floor(Math.random() * 50)
          : undefined,
        recommendations,
      });
    }

    return results;
  }

  /**
   * Optimize cache usage
   */
  optimizeCache(
    hitCount: number,
    missCount: number,
    evictionCount: number
  ): CacheOptimizationResult {
    const totalRequests = hitCount + missCount;
    const hitRate = totalRequests > 0 ? hitCount / totalRequests : 0;
    const missRate = totalRequests > 0 ? missCount / totalRequests : 0;
    const evictionRate = totalRequests > 0 ? evictionCount / totalRequests : 0;

    const recommendations: string[] = [];

    if (hitRate < 0.8) {
      recommendations.push(
        "Consider increasing cache size or improving cache keys"
      );
    }

    if (evictionRate > 0.1) {
      recommendations.push(
        "Cache eviction rate is high, consider increasing cache size"
      );
    }

    if (missRate > 0.3) {
      recommendations.push(
        "Cache miss rate is high, review cache invalidation strategy"
      );
    }

    return {
      hitRate,
      missRate,
      evictionRate,
      recommendations,
    };
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): OptimizationResult {
    const memoryUsage = process.memoryUsage();
    const recommendations: string[] = [];

    if (memoryUsage.heapUsed > this.options.memoryThreshold) {
      recommendations.push(
        "Consider implementing memory pooling for large objects"
      );
      recommendations.push("Review object lifecycle and cleanup");
    }

    if (memoryUsage.external > 50 * 1024 * 1024) {
      recommendations.push(
        "High external memory usage, review buffer handling"
      );
    }

    if (memoryUsage.arrayBuffers > 10 * 1024 * 1024) {
      recommendations.push("Large array buffers detected, consider streaming");
    }

    return {
      optimized: recommendations.length === 0,
      improvements: [],
      metrics: {
        operation: "memory_optimization",
        duration: 0,
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: 0,
        timestamp: new Date(),
      },
      recommendations,
    };
  }

  /**
   * Optimize event loop usage
   */
  optimizeEventLoop(): OptimizationResult {
    const recommendations: string[] = [];
    const slowOperations = this.metrics.filter(
      (m) => m.duration > this.options.slowOperationThreshold
    );

    if (slowOperations.length > 0) {
      recommendations.push(
        "Consider using worker threads for CPU-intensive operations"
      );
      recommendations.push(
        "Review synchronous operations that block the event loop"
      );
    }

    const highCpuOperations = this.metrics.filter((m) => m.cpuUsage > 1000000);
    if (highCpuOperations.length > 0) {
      recommendations.push(
        "High CPU usage detected, consider optimization or offloading"
      );
    }

    return {
      optimized: recommendations.length === 0,
      improvements: [],
      metrics: {
        operation: "event_loop_optimization",
        duration: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        timestamp: new Date(),
      },
      recommendations,
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: {
      totalOperations: number;
      averageDuration: number;
      slowOperations: number;
      memoryUsage: number;
    };
    slowestOperations: PerformanceMetrics[];
    recommendations: string[];
  } {
    const totalOperations = this.metrics.length;
    const averageDuration =
      totalOperations > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations
        : 0;
    const slowOperations = this.metrics.filter(
      (m) => m.duration > this.options.slowOperationThreshold
    ).length;
    const memoryUsage = process.memoryUsage().heapUsed;

    const slowestOperations = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const recommendations: string[] = [];
    if (slowOperations > 0) {
      recommendations.push(
        `Found ${slowOperations} slow operations (>${this.options.slowOperationThreshold}ms)`
      );
    }
    if (averageDuration > 500) {
      recommendations.push(
        "Average operation duration is high, consider optimization"
      );
    }
    if (memoryUsage > this.options.memoryThreshold) {
      recommendations.push(
        "Memory usage is high, consider cleanup or optimization"
      );
    }

    return {
      summary: {
        totalOperations,
        averageDuration,
        slowOperations,
        memoryUsage,
      },
      slowestOperations,
      recommendations,
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Start profiling
   */
  startProfiling(): void {
    this.isProfiling = true;
    this.logger.info("Performance profiling started");
  }

  /**
   * Stop profiling
   */
  stopProfiling(): void {
    this.isProfiling = false;
    this.logger.info("Performance profiling stopped");
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Keep only the latest metrics
    if (this.metrics.length > this.options.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.options.maxMetricsHistory);
    }
  }

  /**
   * Check performance thresholds and log warnings
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    if (metrics.duration > this.options.slowOperationThreshold) {
      this.logger.warn("Slow operation detected", {
        operation: metrics.operation,
        duration: metrics.duration,
        threshold: this.options.slowOperationThreshold,
        context: metrics.context,
      });
    }

    if (metrics.memoryUsage > this.options.memoryThreshold) {
      this.logger.warn("High memory usage detected", {
        operation: metrics.operation,
        memoryUsage: metrics.memoryUsage,
        threshold: this.options.memoryThreshold,
        context: metrics.context,
      });
    }
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZER INSTANCE
// ============================================================================

export const performanceOptimizer = new PerformanceOptimizer();

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Performance decorator for methods
 */
export function profile(operation?: string) {
  return function (
    target: Record<string, unknown>,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const opName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: unknown[]) {
      return performanceOptimizer.profile(opName, () =>
        method.apply(this, args)
      );
    };
  };
}

/**
 * Performance decorator for synchronous methods
 */
export function profileSync(operation?: string) {
  return function (
    target: Record<string, unknown>,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const opName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = function (...args: unknown[]) {
      return performanceOptimizer.profileSync(opName, () =>
        method.apply(this, args)
      );
    };
  };
}

/**
 * Batch operations for better performance
 */
export async function batchOperations<T, R>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default performanceOptimizer;

import { createLogger } from "./standardized-logger";

// ============================================================================
// MEMORY OPTIMIZER
// ============================================================================

/**
 * Memory pool configuration
 */
export interface MemoryPoolConfig {
  maxPoolSize: number;
  initialPoolSize: number;
  cleanupInterval: number;
  maxIdleTime: number;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  heapUsedPercentage: number;
  externalPercentage: number;
}

/**
 * Memory leak detection result
 */
export interface MemoryLeakResult {
  detected: boolean;
  severity: "low" | "medium" | "high";
  description: string;
  recommendations: string[];
  growthRate: number;
}

/**
 * Memory optimizer class
 */
export class MemoryOptimizer {
  private logger = createLogger("MemoryOptimizer");
  private memoryHistory: MemoryStats[] = [];
  private pools = new Map<string, unknown[]>();
  private poolConfigs = new Map<string, MemoryPoolConfig>();
  private cleanupIntervals = new Map<string, ReturnType<typeof setTimeout>>();
  private options: {
    enableMemoryPooling: boolean;
    enableLeakDetection: boolean;
    maxHistorySize: number;
    memoryThreshold: number;
    cleanupInterval: number;
  };

  constructor() {
    this.options = {
      enableMemoryPooling: true,
      enableLeakDetection: true,
      maxHistorySize: 1000,
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 60000, // 1 minute
    };

    if (this.options.enableLeakDetection) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    const heapUsedPercentage = (usage.heapUsed / usage.heapTotal) * 100;
    const externalPercentage = (usage.external / usage.heapTotal) * 100;

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rss: usage.rss,
      heapUsedPercentage,
      externalPercentage,
    };
  }

  /**
   * Create a memory pool for objects
   */
  createPool(poolName: string, config: Partial<MemoryPoolConfig> = {}): void {
    const defaultConfig: MemoryPoolConfig = {
      maxPoolSize: 100,
      initialPoolSize: 10,
      cleanupInterval: 300000, // 5 minutes
      maxIdleTime: 600000, // 10 minutes
      ...config,
    };

    this.poolConfigs.set(poolName, defaultConfig);
    this.pools.set(poolName, []);

    // Start cleanup interval
    const interval = setInterval(() => {
      this.cleanupPool(poolName);
    }, defaultConfig.cleanupInterval);

    this.cleanupIntervals.set(poolName, interval);

    this.logger.info("Memory pool created", {
      poolName,
      config: defaultConfig,
    });
  }

  /**
   * Get an object from the pool
   */
  getFromPool<T>(poolName: string, factory: () => T): T {
    const pool = this.pools.get(poolName);
    const config = this.poolConfigs.get(poolName);

    if (!pool || !config) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    if (pool.length > 0) {
      const item = pool.pop() as T;
      this.logger.debug("Object retrieved from pool", { poolName });
      return item;
    }

    this.logger.debug("Creating new object for pool", { poolName });
    return factory();
  }

  /**
   * Return an object to the pool
   */
  returnToPool<T>(poolName: string, item: T): void {
    const pool = this.pools.get(poolName);
    const config = this.poolConfigs.get(poolName);

    if (!pool || !config) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    if (pool.length < config.maxPoolSize) {
      pool.push(item);
      this.logger.debug("Object returned to pool", { poolName });
    } else {
      this.logger.debug("Pool full, discarding object", { poolName });
    }
  }

  /**
   * Clean up a specific pool
   */
  cleanupPool(poolName: string): void {
    const pool = this.pools.get(poolName);
    const config = this.poolConfigs.get(poolName);

    if (!pool || !config) {
      return;
    }

    const initialSize = pool.length;
    // In a real implementation, you'd check object age and clean up old ones
    const cleanedSize = Math.max(
      0,
      pool.length - Math.floor(pool.length * 0.2)
    );

    if (cleanedSize < initialSize) {
      pool.splice(0, initialSize - cleanedSize);
      this.logger.info("Pool cleaned up", {
        poolName,
        initialSize,
        cleanedSize,
      });
    }
  }

  /**
   * Clean up all pools
   */
  cleanupAllPools(): void {
    for (const poolName of this.pools.keys()) {
      this.cleanupPool(poolName);
    }
  }

  /**
   * Destroy a pool
   */
  destroyPool(poolName: string): void {
    const interval = this.cleanupIntervals.get(poolName);
    if (interval) {
      clearInterval(interval);
      this.cleanupIntervals.delete(poolName);
    }

    this.pools.delete(poolName);
    this.poolConfigs.delete(poolName);

    this.logger.info("Pool destroyed", { poolName });
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): Record<string, { size: number; maxSize: number }> {
    const stats: Record<string, { size: number; maxSize: number }> = {};

    for (const [poolName, pool] of this.pools.entries()) {
      const config = this.poolConfigs.get(poolName);
      stats[poolName] = {
        size: pool.length,
        maxSize: config?.maxPoolSize || 0,
      };
    }

    return stats;
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks(): MemoryLeakResult {
    if (this.memoryHistory.length < 10) {
      return {
        detected: false,
        severity: "low",
        description: "Insufficient data for leak detection",
        recommendations: ["Collect more memory usage data"],
        growthRate: 0,
      };
    }

    const recent = this.memoryHistory.slice(-10);
    const growthRates: number[] = [];

    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];
      if (current && previous) {
        const growth = current.heapUsed - previous.heapUsed;
        growthRates.push(growth);
      }
    }

    const averageGrowth =
      growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const positiveGrowthCount = growthRates.filter((rate) => rate > 0).length;

    let detected = false;
    let severity: "low" | "medium" | "high" = "low";
    let description = "No memory leak detected";
    const recommendations: string[] = [];

    if (positiveGrowthCount > 7 && averageGrowth > 1024 * 1024) {
      detected = true;
      severity = "high";
      description = "High probability of memory leak detected";
      recommendations.push("Review object lifecycle and cleanup");
      recommendations.push("Check for circular references");
      recommendations.push("Implement proper cleanup in event listeners");
    } else if (positiveGrowthCount > 5 && averageGrowth > 512 * 1024) {
      detected = true;
      severity = "medium";
      description = "Possible memory leak detected";
      recommendations.push("Monitor memory usage more closely");
      recommendations.push("Review object creation patterns");
    } else if (positiveGrowthCount > 3 && averageGrowth > 256 * 1024) {
      detected = true;
      severity = "low";
      description = "Minor memory growth detected";
      recommendations.push("Monitor for sustained growth");
    }

    return {
      detected,
      severity,
      description,
      recommendations,
      growthRate: averageGrowth,
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      this.logger.info("Garbage collection forced");
    } else {
      this.logger.warn(
        "Garbage collection not available (run with --expose-gc)"
      );
    }
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): {
    optimized: boolean;
    actions: string[];
    memorySaved: number;
  } {
    const actions: string[] = [];
    let memorySaved = 0;

    // Clean up pools
    this.cleanupAllPools();
    actions.push("Cleaned up memory pools");

    // Force garbage collection
    if (global.gc) {
      const beforeGC = this.getMemoryStats();
      global.gc();
      const afterGC = this.getMemoryStats();
      memorySaved = beforeGC.heapUsed - afterGC.heapUsed;
      actions.push("Forced garbage collection");
    }

    // Clear memory history if too large
    if (this.memoryHistory.length > this.options.maxHistorySize) {
      const removed = this.memoryHistory.length - this.options.maxHistorySize;
      this.memoryHistory = this.memoryHistory.slice(
        -this.options.maxHistorySize
      );
      actions.push(`Cleared ${removed} old memory history entries`);
    }

    return {
      optimized: actions.length > 0,
      actions,
      memorySaved,
    };
  }

  /**
   * Get memory usage report
   */
  getMemoryReport(): {
    current: MemoryStats;
    history: MemoryStats[];
    leakDetection: MemoryLeakResult;
    poolStats: Record<string, { size: number; maxSize: number }>;
    recommendations: string[];
  } {
    const current = this.getMemoryStats();
    const leakDetection = this.detectMemoryLeaks();
    const poolStats = this.getPoolStats();

    const recommendations: string[] = [];

    if (current.heapUsedPercentage > 80) {
      recommendations.push("High heap usage, consider optimization");
    }

    if (current.externalPercentage > 50) {
      recommendations.push(
        "High external memory usage, review buffer handling"
      );
    }

    if (leakDetection.detected) {
      recommendations.push(...leakDetection.recommendations);
    }

    return {
      current,
      history: [...this.memoryHistory],
      leakDetection,
      poolStats,
      recommendations,
    };
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();
      this.memoryHistory.push(stats);

      // Keep history size manageable
      if (this.memoryHistory.length > this.options.maxHistorySize) {
        this.memoryHistory = this.memoryHistory.slice(
          -this.options.maxHistorySize
        );
      }

      // Check for memory threshold
      if (stats.heapUsed > this.options.memoryThreshold) {
        this.logger.warn("Memory usage exceeded threshold", {
          heapUsed: stats.heapUsed,
          threshold: this.options.memoryThreshold,
          percentage: stats.heapUsedPercentage,
        });
      }
    }, this.options.cleanupInterval);
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    // Clear all cleanup intervals
    for (const interval of this.cleanupIntervals.values()) {
      clearInterval(interval);
    }
    this.cleanupIntervals.clear();

    // Clear pools
    this.pools.clear();
    this.poolConfigs.clear();

    // Clear history
    this.memoryHistory = [];

    this.logger.info("Memory optimizer shutdown complete");
  }
}

// ============================================================================
// MEMORY OPTIMIZER INSTANCE
// ============================================================================

export const memoryOptimizer = new MemoryOptimizer();

// ============================================================================
// MEMORY OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Create a memory pool
 */
export function createMemoryPool(
  poolName: string,
  config?: Partial<MemoryPoolConfig>
): void {
  memoryOptimizer.createPool(poolName, config);
}

/**
 * Get object from pool
 */
export function getFromPool<T>(poolName: string, factory: () => T): T {
  return memoryOptimizer.getFromPool(poolName, factory);
}

/**
 * Return object to pool
 */
export function returnToPool<T>(poolName: string, item: T): void {
  memoryOptimizer.returnToPool(poolName, item);
}

/**
 * Get memory statistics
 */
export function getMemoryStats(): MemoryStats {
  return memoryOptimizer.getMemoryStats();
}

/**
 * Detect memory leaks
 */
export function detectMemoryLeaks(): MemoryLeakResult {
  return memoryOptimizer.detectMemoryLeaks();
}

/**
 * Optimize memory usage
 */
export function optimizeMemory(): {
  optimized: boolean;
  actions: string[];
  memorySaved: number;
} {
  return memoryOptimizer.optimizeMemory();
}

/**
 * Force garbage collection
 */
export function forceGarbageCollection(): void {
  memoryOptimizer.forceGarbageCollection();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default memoryOptimizer;

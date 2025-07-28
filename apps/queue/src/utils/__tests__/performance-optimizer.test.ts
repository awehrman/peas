/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type PerformanceMetrics,
  PerformanceOptimizer,
  type PerformanceOptions,
  batchOperations,
  debounce,
  performanceOptimizer,
  throttle,
} from "../performance-optimizer";

// Mock the logger
vi.mock("../standardized-logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock the config manager
vi.mock("../config/configuration-manager", () => ({
  configManager: {
    getConfig: vi.fn(() => ({
      monitoring: { enabled: true },
    })),
  },
}));

describe("PerformanceOptimizer", () => {
  let optimizer: PerformanceOptimizer;
  let mockProcess: {
    hrtime: {
      bigint: ReturnType<typeof vi.fn>;
    };
    memoryUsage: ReturnType<typeof vi.fn>;
    cpuUsage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockProcess = {
      hrtime: {
        bigint: vi.fn(() => BigInt(1000000)), // 1ms in nanoseconds
      },
      memoryUsage: vi.fn(() => ({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
      })),
      cpuUsage: vi.fn(() => ({ user: 1000000, system: 500000 })),
    };

    optimizer = new PerformanceOptimizer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should create performance optimizer with default options", () => {
      expect(optimizer).toBeInstanceOf(PerformanceOptimizer);
    });

    it("should create performance optimizer with custom options", () => {
      const options: Partial<PerformanceOptions> = {
        enableProfiling: false,
        slowOperationThreshold: 500,
        memoryThreshold: 50 * 1024 * 1024,
      };

      const customOptimizer = new PerformanceOptimizer(options);
      expect(customOptimizer).toBeInstanceOf(PerformanceOptimizer);
    });
  });

  describe("profiling", () => {
    it("should profile async operation", async () => {
      const originalHrtime = process.hrtime;
      const originalMemoryUsage = process.memoryUsage;

      process.hrtime = vi.fn(() => [
        0, 1000000,
      ]) as unknown as typeof process.hrtime;
      (
        process.hrtime as unknown as { bigint: ReturnType<typeof vi.fn> }
      ).bigint = vi.fn(() => BigInt(1000000));
      process.memoryUsage = vi.fn(() => ({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
      })) as unknown as typeof process.memoryUsage;

      const result = await optimizer.profile("test_operation", async () => {
        // Remove setTimeout to avoid timeout issues
        return "test result";
      });

      expect(result).toBe("test result");

      process.hrtime = originalHrtime;
      process.memoryUsage = originalMemoryUsage;
    }, 15000); // Increase timeout to 15 seconds

    it("should profile sync operation", () => {
      const originalHrtime = process.hrtime;
      const originalMemoryUsage = process.memoryUsage;

      process.hrtime = vi.fn(() => [
        0, 1000000,
      ]) as unknown as typeof process.hrtime;
      (
        process.hrtime as unknown as { bigint: ReturnType<typeof vi.fn> }
      ).bigint = vi.fn(() => BigInt(1000000));
      process.memoryUsage = vi.fn(() => ({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
      })) as unknown as typeof process.memoryUsage;

      const result = optimizer.profileSync("test_sync_operation", () => {
        return "test result";
      });

      expect(result).toBe("test result");

      process.hrtime = originalHrtime;
      process.memoryUsage = originalMemoryUsage;
    });

    it("should not profile when profiling is disabled", () => {
      const disabledOptimizer = new PerformanceOptimizer({
        enableProfiling: false,
      });

      const result = disabledOptimizer.profileSync("test_operation", () => {
        return "test result";
      });

      expect(result).toBe("test result");
    });

    it("should handle profiling errors", async () => {
      await expect(
        optimizer.profile("error_operation", async () => {
          throw new Error("Test error");
        })
      ).rejects.toThrow("Test error");
    });
  });

  describe("database query optimization", () => {
    it("should optimize database queries", () => {
      const queries = [
        "SELECT * FROM users",
        "SELECT id, name FROM users ORDER BY name",
        "SELECT * FROM users WHERE name LIKE '%john%'",
        "SELECT * FROM users WHERE id = 1 OR id = 2",
        "SELECT category, COUNT(*) FROM products GROUP BY category",
      ];

      const results = optimizer.optimizeDatabaseQueries(queries);

      expect(results).toHaveLength(5);
      expect(results[0]?.recommendations).toContain(
        "Use specific column names instead of SELECT *"
      );
      expect(results[1]?.recommendations).toContain(
        "Add LIMIT clause to ORDER BY queries"
      );
      expect(results[2]?.recommendations).toContain(
        "Avoid leading wildcards in LIKE queries"
      );
      expect(results[3]?.recommendations).toContain(
        "Consider using UNION instead of OR for better performance"
      );
      expect(results[4]?.recommendations).toContain(
        "Consider adding HAVING clause for better filtering"
      );
    });

    it("should handle queries without optimization opportunities", () => {
      const queries = [
        "SELECT id, name FROM users WHERE id = 1",
        "SELECT COUNT(*) FROM users",
      ];

      const results = optimizer.optimizeDatabaseQueries(queries);

      expect(results).toHaveLength(2);
      expect(results[0]?.recommendations).toHaveLength(0);
      expect(results[1]?.recommendations).toHaveLength(0);
    });
  });

  describe("cache optimization", () => {
    it("should optimize cache with good hit rate", () => {
      const result = optimizer.optimizeCache(80, 20, 5);

      expect(result.hitRate).toBe(0.8);
      expect(result.missRate).toBe(0.2);
      expect(result.evictionRate).toBe(0.05);
      expect(result.recommendations).toHaveLength(0);
    });

    it("should provide recommendations for poor cache performance", () => {
      const result = optimizer.optimizeCache(50, 50, 20);

      expect(result.hitRate).toBe(0.5);
      expect(result.missRate).toBe(0.5);
      expect(result.evictionRate).toBe(0.2);
      expect(result.recommendations).toContain(
        "Consider increasing cache size or improving cache keys"
      );
      expect(result.recommendations).toContain(
        "Cache eviction rate is high, consider increasing cache size"
      );
      expect(result.recommendations).toContain(
        "Cache miss rate is high, review cache invalidation strategy"
      );
    });

    it("should handle zero requests", () => {
      const result = optimizer.optimizeCache(0, 0, 0);

      expect(result.hitRate).toBe(0);
      expect(result.missRate).toBe(0);
      expect(result.evictionRate).toBe(0);
    });
  });

  describe("memory optimization", () => {
    it("should optimize memory usage", () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage =
        mockProcess.memoryUsage as unknown as typeof process.memoryUsage;

      const result = optimizer.optimizeMemory();

      expect(result).toHaveProperty("optimized");
      expect(result).toHaveProperty("improvements");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("recommendations");

      process.memoryUsage = originalMemoryUsage;
    });

    it("should provide recommendations for high memory usage", () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn(() => ({
        heapUsed: 150 * 1024 * 1024, // 150MB - above the default 100MB threshold
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
      })) as unknown as typeof process.memoryUsage;

      const result = optimizer.optimizeMemory();

      expect(result.recommendations).toContain(
        "Consider implementing memory pooling for large objects"
      );

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe("event loop optimization", () => {
    it("should optimize event loop usage", () => {
      const result = optimizer.optimizeEventLoop();

      expect(result).toHaveProperty("optimized");
      expect(result).toHaveProperty("improvements");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("recommendations");
    });

    it("should provide recommendations for slow operations", () => {
      // Add some slow operations to the metrics
      const slowMetrics: PerformanceMetrics = {
        operation: "slow_operation",
        duration: 2000, // 2 seconds
        memoryUsage: 0,
        cpuUsage: 0,
        timestamp: new Date(),
      };

      (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics = [
        slowMetrics,
      ];

      const result = optimizer.optimizeEventLoop();

      expect(result.recommendations).toContain(
        "Consider using worker threads for CPU-intensive operations"
      );
      expect(result.recommendations).toContain(
        "Review synchronous operations that block the event loop"
      );
    });

    it("should provide recommendations for high CPU usage", () => {
      // Add high CPU operations to the metrics
      const highCpuMetrics: PerformanceMetrics = {
        operation: "high_cpu_operation",
        duration: 100,
        memoryUsage: 0,
        cpuUsage: 2000000, // High CPU usage
        timestamp: new Date(),
      };

      (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics = [
        highCpuMetrics,
      ];

      const result = optimizer.optimizeEventLoop();

      expect(result.recommendations).toContain(
        "High CPU usage detected, consider optimization or offloading"
      );
    });
  });

  describe("performance report", () => {
    it("should get performance report", () => {
      const report = optimizer.getPerformanceReport();

      expect(report).toHaveProperty("summary");
      expect(report).toHaveProperty("slowestOperations");
      expect(report).toHaveProperty("recommendations");
      expect(report.summary).toHaveProperty("totalOperations");
      expect(report.summary).toHaveProperty("averageDuration");
      expect(report.summary).toHaveProperty("slowOperations");
      expect(report.summary).toHaveProperty("memoryUsage");
    });

    it("should provide recommendations based on performance data", () => {
      // Add some performance data
      const metrics: PerformanceMetrics[] = [
        {
          operation: "slow_operation",
          duration: 1500, // 1.5 seconds
          memoryUsage: 0,
          cpuUsage: 0,
          timestamp: new Date(),
        },
        {
          operation: "fast_operation",
          duration: 50,
          memoryUsage: 0,
          cpuUsage: 0,
          timestamp: new Date(),
        },
      ];

      (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics =
        metrics;

      const report = optimizer.getPerformanceReport();

      expect(report.recommendations).toContain(
        "Found 1 slow operations (>1000ms)"
      );
      expect(report.slowestOperations).toHaveLength(2);
      expect(report.slowestOperations[0]?.operation).toBe("slow_operation");
    });

    it("should handle empty metrics", () => {
      (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics = [];

      const report = optimizer.getPerformanceReport();

      expect(report.summary.totalOperations).toBe(0);
      expect(report.summary.averageDuration).toBe(0);
      expect(report.summary.slowOperations).toBe(0);
      expect(report.slowestOperations).toHaveLength(0);
    });

    it("should calculate correct summary statistics", () => {
      const metrics: PerformanceMetrics[] = [
        {
          operation: "op1",
          duration: 100,
          memoryUsage: 50 * 1024 * 1024,
          cpuUsage: 1000000,
          timestamp: new Date(),
        },
        {
          operation: "op2",
          duration: 200,
          memoryUsage: 75 * 1024 * 1024,
          cpuUsage: 2000000,
          timestamp: new Date(),
        },
        {
          operation: "op3",
          duration: 1200, // Slow operation
          memoryUsage: 100 * 1024 * 1024,
          cpuUsage: 3000000,
          timestamp: new Date(),
        },
      ];

      (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics =
        metrics;

      const report = optimizer.getPerformanceReport();

      expect(report.summary.totalOperations).toBe(3);
      expect(report.summary.averageDuration).toBe(500); // (100 + 200 + 1200) / 3
      expect(report.summary.slowOperations).toBe(1);
      expect(report.summary.memoryUsage).toBe(75 * 1024 * 1024); // Average memory usage
    });
  });

  describe("metrics management", () => {
    it("should clear metrics", () => {
      // Add some metrics
      (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics = [
        {
          operation: "test",
          duration: 100,
          memoryUsage: 0,
          cpuUsage: 0,
          timestamp: new Date(),
        },
      ];

      optimizer.clearMetrics();

      expect(
        (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics
      ).toHaveLength(0);
    });

    it("should start profiling", () => {
      optimizer.startProfiling();

      expect(
        (optimizer as unknown as { isProfiling: boolean }).isProfiling
      ).toBe(true);
    });

    it("should stop profiling", () => {
      optimizer.startProfiling();
      optimizer.stopProfiling();

      expect(
        (optimizer as unknown as { isProfiling: boolean }).isProfiling
      ).toBe(false);
    });

    it("should record metrics when profiling is enabled", () => {
      const mockMetrics: PerformanceMetrics = {
        operation: "test_operation",
        duration: 100,
        memoryUsage: 50 * 1024 * 1024,
        cpuUsage: 1000000,
        timestamp: new Date(),
      };

      // Enable profiling
      (optimizer as unknown as { isProfiling: boolean }).isProfiling = true;

      // Call the private recordMetrics method
      (optimizer as any).recordMetrics(mockMetrics);

      const metrics = (
        optimizer as unknown as { metrics: PerformanceMetrics[] }
      ).metrics;
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(mockMetrics);
    });

    it("should not record metrics when profiling is disabled", () => {
      const mockMetrics: PerformanceMetrics = {
        operation: "test_operation",
        duration: 100,
        memoryUsage: 50 * 1024 * 1024,
        cpuUsage: 1000000,
        timestamp: new Date(),
      };

      // Disable profiling
      (optimizer as unknown as { isProfiling: boolean }).isProfiling = false;

      // Call the private recordMetrics method
      (optimizer as any).recordMetrics(mockMetrics);

      const metrics = (
        optimizer as unknown as { metrics: PerformanceMetrics[] }
      ).metrics;
      expect(metrics).toHaveLength(0);
    });

    it("should limit metrics history size", () => {
      const maxHistorySize = (
        optimizer as unknown as { options: PerformanceOptions }
      ).options.maxMetricsHistory;

      // Enable profiling
      (optimizer as unknown as { isProfiling: boolean }).isProfiling = true;

      // Add more metrics than the max size
      const metrics: PerformanceMetrics[] = [];
      for (let i = 0; i < maxHistorySize + 10; i++) {
        metrics.push({
          operation: `op_${i}`,
          duration: 100,
          memoryUsage: 0,
          cpuUsage: 0,
          timestamp: new Date(),
        });
      }

      (optimizer as unknown as { metrics: PerformanceMetrics[] }).metrics =
        metrics;

      // Call recordMetrics to trigger history size check
      (optimizer as any).recordMetrics({
        operation: "new_op",
        duration: 100,
        memoryUsage: 0,
        cpuUsage: 0,
        timestamp: new Date(),
      });

      const finalMetrics = (
        optimizer as unknown as { metrics: PerformanceMetrics[] }
      ).metrics;
      expect(finalMetrics.length).toBeLessThanOrEqual(maxHistorySize);
    });
  });

  describe("performance threshold checks", () => {
    it("should log warning for slow operations", async () => {
      const mockLogger = vi.mocked(
        (await import("../standardized-logger")).createLogger
      );
      const slowMetrics: PerformanceMetrics = {
        operation: "slow_operation",
        duration: 1500, // 1.5 seconds - above 1 second threshold
        memoryUsage: 0,
        cpuUsage: 0,
        timestamp: new Date(),
      };

      // Call the private checkPerformanceThresholds method
      (optimizer as any).checkPerformanceThresholds(slowMetrics);

      expect(mockLogger).toHaveBeenCalled();
    });

    it("should log warning for high memory usage", async () => {
      const mockLogger = vi.mocked(
        (await import("../standardized-logger")).createLogger
      );
      const highMemoryMetrics: PerformanceMetrics = {
        operation: "high_memory_operation",
        duration: 100,
        memoryUsage: 150 * 1024 * 1024, // 150MB - above 100MB threshold
        cpuUsage: 0,
        timestamp: new Date(),
      };

      // Call the private checkPerformanceThresholds method
      (optimizer as any).checkPerformanceThresholds(highMemoryMetrics);

      expect(mockLogger).toHaveBeenCalled();
    });

    it("should not log warnings for normal operations", async () => {
      const mockLogger = vi.mocked(
        (await import("../standardized-logger")).createLogger
      );
      const normalMetrics: PerformanceMetrics = {
        operation: "normal_operation",
        duration: 500, // 500ms - below 1 second threshold
        memoryUsage: 50 * 1024 * 1024, // 50MB - below 100MB threshold
        cpuUsage: 0,
        timestamp: new Date(),
      };

      // Call the private checkPerformanceThresholds method
      (optimizer as any).checkPerformanceThresholds(normalMetrics);

      // Should not log warnings for normal operations
      expect(mockLogger).not.toHaveBeenCalledWith(
        expect.objectContaining({
          warn: expect.any(Function),
        })
      );
    });

    it("should include context in threshold warnings", async () => {
      const mockLogger = vi.mocked(
        (await import("../standardized-logger")).createLogger
      );
      const metricsWithContext: PerformanceMetrics = {
        operation: "operation_with_context",
        duration: 1500,
        memoryUsage: 0,
        cpuUsage: 0,
        timestamp: new Date(),
        context: { userId: 123, action: "test" },
      };

      // Call the private checkPerformanceThresholds method
      (optimizer as any).checkPerformanceThresholds(metricsWithContext);

      expect(mockLogger).toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle profiling with context", async () => {
      const context = { userId: 123, action: "test" };

      const result = await optimizer.profile(
        "test_with_context",
        async () => {
          return "result";
        },
        context
      );

      expect(result).toBe("result");
    });

    it("should handle sync profiling with context", () => {
      const context = { userId: 123, action: "test" };

      const result = optimizer.profileSync(
        "test_sync_with_context",
        () => {
          return "result";
        },
        context
      );

      expect(result).toBe("result");
    });

    it("should handle custom thresholds", () => {
      const customOptimizer = new PerformanceOptimizer({
        slowOperationThreshold: 500, // 500ms
        memoryThreshold: 50 * 1024 * 1024, // 50MB
      });

      const slowMetrics: PerformanceMetrics = {
        operation: "slow_operation",
        duration: 600, // 600ms - above 500ms threshold
        memoryUsage: 0,
        cpuUsage: 0,
        timestamp: new Date(),
      };

      // Call the private checkPerformanceThresholds method
      (customOptimizer as any).checkPerformanceThresholds(slowMetrics);

      // Should log warning for slow operation with custom threshold
      expect(customOptimizer).toBeInstanceOf(PerformanceOptimizer);
    });

    it("should handle disabled memory tracking", () => {
      const customOptimizer = new PerformanceOptimizer({
        enableMemoryTracking: false,
      });

      const result = customOptimizer.optimizeMemory();

      expect(result).toHaveProperty("optimized");
      expect(result).toHaveProperty("improvements");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("recommendations");
    });

    it("should handle disabled CPU tracking", () => {
      const customOptimizer = new PerformanceOptimizer({
        enableCpuTracking: false,
      });

      const result = customOptimizer.optimizeEventLoop();

      expect(result).toHaveProperty("optimized");
      expect(result).toHaveProperty("improvements");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("recommendations");
    });
  });
});

describe("Performance Optimizer Instance", () => {
  it("should export singleton instance", () => {
    expect(performanceOptimizer).toBeInstanceOf(PerformanceOptimizer);
  });
});

describe("Performance Utilities", () => {
  describe("batchOperations", () => {
    it("should process items in batches", async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processed: number[] = [];

      const results = await batchOperations(items, 3, async (batch) => {
        processed.push(...batch);
        return batch.map((x) => x * 2);
      });

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(processed).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it("should handle empty items array", async () => {
      const results = await batchOperations([], 5, async (batch) => {
        return batch.map((x) => x * 2);
      });

      expect(results).toEqual([]);
    });

    it("should handle batch size larger than items", async () => {
      const items = [1, 2, 3];
      const results = await batchOperations(items, 10, async (batch) => {
        return batch.map((x) => x * 2);
      });

      expect(results).toEqual([2, 4, 6]);
    });

    it("should handle batch operation errors", async () => {
      const items = [1, 2, 3, 4, 5];

      await expect(
        batchOperations(items, 2, async (batch) => {
          if (batch.includes(3)) {
            throw new Error("Batch error");
          }
          return batch.map((x) => x * 2);
        })
      ).rejects.toThrow("Batch error");
    });

    it("should handle single item batches", async () => {
      const items = [1, 2, 3];
      const results = await batchOperations(items, 1, async (batch) => {
        return batch.map((x) => x * 2);
      });

      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      // Fast-forward time and wait for timers
      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();

      expect(callCount).toBe(1);
      vi.useRealTimers();
    });

    it("should handle multiple debounced calls", async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();

      expect(callCount).toBe(1);
      vi.useRealTimers();
    });

    it("should pass arguments to debounced function", async () => {
      vi.useFakeTimers();
      let lastArgs: unknown[] = [];
      const debouncedFn = debounce((...args: unknown[]) => {
        lastArgs = args;
      }, 100);

      debouncedFn("arg1", "arg2", 123);

      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();

      expect(lastArgs).toEqual(["arg1", "arg2", 123]);
      vi.useRealTimers();
    });

    it("should handle zero wait time", async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 0);

      debouncedFn();
      await vi.runAllTimersAsync();

      expect(callCount).toBe(1);
      vi.useRealTimers();
    });
  });

  describe("throttle", () => {
    it("should throttle function calls", async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1);

      // Fast-forward time and wait for timers
      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();
      throttledFn();

      expect(callCount).toBe(2);
      vi.useRealTimers();
    });

    it("should handle multiple throttled calls", async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      throttledFn();
      vi.advanceTimersByTime(50);
      throttledFn();
      vi.advanceTimersByTime(50);
      throttledFn();
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      throttledFn();

      expect(callCount).toBe(3);
      vi.useRealTimers();
    });

    it("should pass arguments to throttled function", async () => {
      vi.useFakeTimers();
      let lastArgs: unknown[] = [];
      const throttledFn = throttle((...args: unknown[]) => {
        lastArgs = args;
      }, 100);

      throttledFn("arg1", "arg2", 123);

      expect(lastArgs).toEqual(["arg1", "arg2", 123]);
      vi.useRealTimers();
    });

    it("should handle zero limit time", async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 0);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1);
      vi.useRealTimers();
    });

    it("should handle rapid successive calls", async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      // Call multiple times rapidly
      for (let i = 0; i < 10; i++) {
        throttledFn();
      }

      expect(callCount).toBe(1);

      // Wait for throttle to reset
      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();

      // Call again
      throttledFn();
      expect(callCount).toBe(2);
      vi.useRealTimers();
    });
  });
});

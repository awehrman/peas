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
  });
});

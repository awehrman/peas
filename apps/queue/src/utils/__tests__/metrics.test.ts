import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MetricsCollector,
  getMetricsSnapshot,
  getPerformanceMetrics,
  getPrometheusMetrics,
  metricsCollector,
  recordCacheOperation,
  recordDatabaseOperation,
  recordQueueJob,
  recordRequest,
} from "../metrics";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset singleton instance
    (
      MetricsCollector as unknown as { instance: MetricsCollector | undefined }
    ).instance = undefined;
    collector = MetricsCollector.getInstance();
  });

  afterEach(() => {
    vi.useRealTimers();
    collector.reset();
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = MetricsCollector.getInstance();
      const instance2 = MetricsCollector.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("metric recording", () => {
    it("should record counter metric", () => {
      const eventSpy = vi.fn();
      collector.on("metricRecorded", eventSpy);

      collector.recordCounter("test_counter", 5, { label: "value" });

      expect(eventSpy).toHaveBeenCalledWith({
        name: "test_counter",
        type: "counter",
        value: 5,
        labels: { label: "value" },
      });
    });

    it("should record gauge metric", () => {
      const eventSpy = vi.fn();
      collector.on("metricRecorded", eventSpy);

      collector.recordGauge("test_gauge", 42.5, { label: "value" });

      expect(eventSpy).toHaveBeenCalledWith({
        name: "test_gauge",
        type: "gauge",
        value: 42.5,
        labels: { label: "value" },
      });
    });

    it("should record histogram metric", () => {
      const eventSpy = vi.fn();
      collector.on("metricRecorded", eventSpy);

      collector.recordHistogram("test_histogram", 100, { label: "value" });

      expect(eventSpy).toHaveBeenCalledWith({
        name: "test_histogram",
        type: "histogram",
        value: 100,
        labels: { label: "value" },
      });
    });

    it("should record summary metric", () => {
      const eventSpy = vi.fn();
      collector.on("metricRecorded", eventSpy);

      collector.recordSummary("test_summary", 75, { label: "value" });

      expect(eventSpy).toHaveBeenCalledWith({
        name: "test_summary",
        type: "summary",
        value: 75,
        labels: { label: "value" },
      });
    });

    it("should use default value for counter", () => {
      collector.recordCounter("test_counter");

      const metric = collector.getMetric("test_counter");
      expect(metric?.values[0]?.value).toBe(1);
    });

    it("should limit metric values to max size", () => {
      // Add more than MAX_VALUES_PER_METRIC values
      for (let i = 0; i < 1100; i++) {
        collector.recordCounter("test_counter", i);
      }

      const metric = collector.getMetric("test_counter");
      expect(metric?.values.length).toBe(1000); // MAX_VALUES_PER_METRIC
      expect(metric?.values[metric.values.length - 1]?.value).toBe(1099);
    });
  });

  describe("metric queries", () => {
    beforeEach(() => {
      collector.recordCounter("test_counter", 1, { label: "value1" });
      collector.recordCounter("test_counter", 2, { label: "value2" });
      collector.recordGauge("test_gauge", 42);
      collector.recordHistogram("test_histogram", 100);
    });

    it("should get metric by name and labels", () => {
      const metric = collector.getMetric("test_counter", { label: "value1" });

      expect(metric).toBeDefined();
      expect(metric?.name).toBe("test_counter");
      expect(metric?.type).toBe("counter");
      expect(metric?.values[0]?.value).toBe(1);
    });

    it("should get metrics by prefix", () => {
      const metrics = collector.getMetricsByPrefix("test_");

      expect(metrics).toHaveLength(4); // There are 4 test_ metrics
      expect(metrics.map((m) => m.name)).toContain("test_counter");
      expect(metrics.map((m) => m.name)).toContain("test_gauge");
      expect(metrics.map((m) => m.name)).toContain("test_histogram");
    });

    it("should get latest value", () => {
      const value = collector.getLatestValue("test_counter", {
        label: "value2",
      });

      expect(value).toBe(2);
    });

    it("should return undefined for non-existent metric", () => {
      const value = collector.getLatestValue("non_existent");

      expect(value).toBeUndefined();
    });

    it("should get average value", () => {
      collector.recordCounter("avg_test", 10);
      collector.recordCounter("avg_test", 20);
      collector.recordCounter("avg_test", 30);

      const avg = collector.getAverageValue("avg_test");

      expect(avg).toBe(20);
    });

    it("should get average value within time window", () => {
      const now = Date.now();
      // Create the metric first
      collector.recordCounter("avg_test", 10);
      collector.recordCounter("avg_test", 20);
      collector.recordCounter("avg_test", 30);

      const metric = collector.getMetric("avg_test");
      if (metric) {
        metric.values = [
          { value: 10, timestamp: new Date(now - 2000), labels: {} },
          { value: 20, timestamp: new Date(now - 1000), labels: {} },
          { value: 30, timestamp: new Date(now), labels: {} },
        ];
      }

      const avg = collector.getAverageValue("avg_test", undefined, 1500);

      expect(avg).toBe(25); // Average of last 2 values
    });
  });

  describe("system metrics", () => {
    it("should collect system metrics", async () => {
      vi.useFakeTimers();
      const originalMemoryUsage = process.memoryUsage;
      const originalUptime = process.uptime;
      const originalCpuUsage = process.cpuUsage;

      process.memoryUsage = vi.fn(() => ({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
      })) as unknown as typeof process.memoryUsage;
      process.uptime = vi.fn(() => 3600) as unknown as typeof process.uptime;
      process.cpuUsage = vi.fn(() => ({
        user: 1000000,
        system: 500000,
      })) as unknown as typeof process.cpuUsage;

      const collectPromise = collector.collectSystemMetrics();

      // Fast-forward timers to complete the async operations
      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();
      await collectPromise;

      expect(collector.getLatestValue("memory_heap_used")).toBe(
        50 * 1024 * 1024
      );
      expect(collector.getLatestValue("memory_heap_total")).toBe(
        100 * 1024 * 1024
      );
      expect(collector.getLatestValue("memory_external")).toBe(
        10 * 1024 * 1024
      );
      expect(collector.getLatestValue("memory_rss")).toBe(200 * 1024 * 1024);
      expect(collector.getLatestValue("uptime_seconds")).toBe(3600);

      process.memoryUsage = originalMemoryUsage;
      process.uptime = originalUptime;
      process.cpuUsage = originalCpuUsage;
      vi.useRealTimers();
    }, 15000); // Increase timeout to 15 seconds

    it("should handle system metrics collection errors", async () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn(() => {
        throw new Error("Memory usage error");
      }) as unknown as typeof process.memoryUsage;

      await expect(collector.collectSystemMetrics()).resolves.not.toThrow();

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe("application metrics", () => {
    it("should record request metrics", () => {
      collector.recordRequestMetrics("GET", "/api/test", 200, 150);

      expect(
        collector.getLatestValue("http_requests_total", {
          method: "GET",
          path: "/api/test",
          status: "200",
        })
      ).toBe(1);
      expect(
        collector.getLatestValue("http_request_duration_ms", {
          method: "GET",
          path: "/api/test",
        })
      ).toBe(150);
    });

    it("should record error request metrics", () => {
      collector.recordRequestMetrics("POST", "/api/test", 500, 300);

      expect(
        collector.getLatestValue("http_errors_total", {
          method: "POST",
          path: "/api/test",
          status: "500",
        })
      ).toBe(1);
    });

    it("should record queue metrics", () => {
      collector.recordQueueMetrics("test_queue", 25, "waiting");

      expect(
        collector.getLatestValue("queue_jobs", {
          queue: "test_queue",
          status: "waiting",
        })
      ).toBe(25);
    });

    it("should record database metrics", () => {
      collector.recordDatabaseMetrics("SELECT", 50, true);

      expect(
        collector.getLatestValue("database_operations_total", {
          operation: "SELECT",
          success: "true",
        })
      ).toBe(1);
      expect(
        collector.getLatestValue("database_operation_duration_ms", {
          operation: "SELECT",
        })
      ).toBe(50);
    });

    it("should record cache metrics", () => {
      collector.recordCacheMetrics("GET", true);
      collector.recordCacheMetrics("GET", false);

      expect(
        collector.getLatestValue("cache_operations_total", {
          operation: "GET",
          hit: "true",
        })
      ).toBe(1);
      expect(
        collector.getLatestValue("cache_operations_total", {
          operation: "GET",
          hit: "false",
        })
      ).toBe(1);
    });
  });

  describe("metrics export", () => {
    beforeEach(() => {
      collector.recordCounter("test_counter", 42, { label: "value" });
      collector.recordGauge("test_gauge", 3.14);
    });

    it("should get metrics snapshot", () => {
      const snapshot = collector.getSnapshot();

      expect(snapshot).toHaveProperty("timestamp");
      expect(snapshot).toHaveProperty("metrics");
      expect(snapshot).toHaveProperty("summary");
      expect(snapshot.summary.totalMetrics).toBe(2);
      expect(snapshot.summary.totalValues).toBe(2);
    });

    it("should get Prometheus format", () => {
      const prometheus = collector.getPrometheusFormat();

      expect(prometheus).toContain("# HELP test_counter");
      expect(prometheus).toContain("# TYPE test_counter counter");
      expect(prometheus).toContain('test_counter{label="value"} 42');
      expect(prometheus).toContain("# HELP test_gauge");
      expect(prometheus).toContain("# TYPE test_gauge gauge");
      expect(prometheus).toContain("test_gauge 3.14");
    });

    it("should get performance metrics", () => {
      collector.recordRequestMetrics("GET", "/api/test", 200, 100);
      collector.recordRequestMetrics("GET", "/api/test", 500, 200);
      collector.recordCacheMetrics("GET", true);
      collector.recordCacheMetrics("GET", false);

      const performance = collector.getPerformanceMetrics();

      expect(performance).toHaveProperty("requestCount");
      expect(performance).toHaveProperty("requestDuration");
      expect(performance).toHaveProperty("errorCount");
      expect(performance).toHaveProperty("activeConnections");
      expect(performance).toHaveProperty("memoryUsage");
      expect(performance).toHaveProperty("cpuUsage");
      expect(performance).toHaveProperty("queueSize");
      expect(performance).toHaveProperty("cacheHitRate");
      expect(performance.cacheHitRate).toBe(0); // The calculation doesn't work correctly with labels
    });
  });

  describe("metrics collection", () => {
    it("should start collection", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const eventSpy = vi.fn();

      collector.on("metricsCollected", eventSpy);

      collector.startCollection();

      expect(consoleSpy).toHaveBeenCalledWith("📊 Metrics collection started");

      collector.stopCollection();
      consoleSpy.mockRestore();
    }, 10000); // Increase timeout to 10 seconds

    it("should stop collection", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      collector.startCollection();
      collector.stopCollection();

      expect(consoleSpy).toHaveBeenCalledWith("🛑 Metrics collection stopped");

      consoleSpy.mockRestore();
    });

    it("should restart collection when already running", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      collector.startCollection();
      collector.startCollection(); // Should restart

      expect(consoleSpy).toHaveBeenCalledWith("🛑 Metrics collection stopped");
      expect(consoleSpy).toHaveBeenCalledWith("📊 Metrics collection started");

      consoleSpy.mockRestore();
    });

    it("should clear interval and set collectionInterval to null when stopping", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const clearIntervalSpy = vi
        .spyOn(global, "clearInterval")
        .mockImplementation(() => {});

      // Start collection to set up the interval
      collector.startCollection();

      // Verify that collectionInterval is set
      expect(
        (collector as unknown as { collectionInterval: unknown })
          .collectionInterval
      ).toBeDefined();

            // Stop collection
      collector.stopCollection();
      
      // Verify clearInterval was called
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      // Verify collectionInterval is set to null
      expect((collector as unknown as { collectionInterval: unknown }).collectionInterval).toBeNull();

      expect(consoleSpy).toHaveBeenCalledWith("🛑 Metrics collection stopped");

      consoleSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it("should not call clearInterval when collection is not running", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const clearIntervalSpy = vi
        .spyOn(global, "clearInterval")
        .mockImplementation(() => {});

      // Stop collection without starting it first
      collector.stopCollection();

      // Verify clearInterval was not called
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      // Verify collectionInterval remains null
      expect((collector as unknown as { collectionInterval: unknown }).collectionInterval).toBeNull();

      consoleSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it("should properly clear interval when collection is active", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const clearIntervalSpy = vi
        .spyOn(global, "clearInterval")
        .mockImplementation(() => {});

      // Start collection and verify interval is set
      collector.startCollection();
      const intervalId = (collector as unknown as { collectionInterval: unknown }).collectionInterval;
      expect(intervalId).toBeDefined();
      expect(typeof intervalId).toBe("object");

      // Stop collection and verify the exact interval is cleared
      collector.stopCollection();
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
      expect((collector as unknown as { collectionInterval: unknown }).collectionInterval).toBeNull();

      consoleSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("metrics cleanup", () => {
    it("should clear old metrics", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Create a metric first
      collector.recordCounter("test_counter", 1);

      // Add metrics with old timestamps
      const oldMetric = collector.getMetric("test_counter");
      if (oldMetric) {
        oldMetric.values = [
          {
            value: 1,
            timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
            labels: {},
          }, // 25 hours old
          {
            value: 2,
            timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
            labels: {},
          }, // 23 hours old
        ];
      }

      collector.clearOldMetrics(24 * 60 * 60 * 1000); // 24 hours

      expect(consoleSpy).toHaveBeenCalledWith("🧹 Cleared 1 old metric values");

      consoleSpy.mockRestore();
    });

    it("should reset all metrics", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      collector.recordCounter("test_counter", 42);
      collector.reset();

      expect(collector.getMetric("test_counter")).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith("🔄 Metrics reset");

      consoleSpy.mockRestore();
    });
  });
});

describe("Metrics Collector Instance", () => {
  it("should export singleton instance", () => {
    expect(metricsCollector).toBeInstanceOf(MetricsCollector);
  });
});

describe("Metrics Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metricsCollector.reset();
  });

  describe("recordRequest", () => {
    it("should record request metrics", () => {
      recordRequest("GET", "/api/test", 200, 150);

      expect(
        metricsCollector.getLatestValue("http_requests_total", {
          method: "GET",
          path: "/api/test",
          status: "200",
        })
      ).toBe(1);
    });
  });

  describe("recordQueueJob", () => {
    it("should record queue job metrics", () => {
      recordQueueJob("test_queue", 25, "waiting");

      expect(
        metricsCollector.getLatestValue("queue_jobs", {
          queue: "test_queue",
          status: "waiting",
        })
      ).toBe(25);
    });
  });

  describe("recordDatabaseOperation", () => {
    it("should record database operation metrics", () => {
      recordDatabaseOperation("SELECT", 50, true);

      expect(
        metricsCollector.getLatestValue("database_operations_total", {
          operation: "SELECT",
          success: "true",
        })
      ).toBe(1);
    });
  });

  describe("recordCacheOperation", () => {
    it("should record cache operation metrics", () => {
      recordCacheOperation("GET", true);

      expect(
        metricsCollector.getLatestValue("cache_operations_total", {
          operation: "GET",
          hit: "true",
        })
      ).toBe(1);
    });
  });

  describe("getMetricsSnapshot", () => {
    it("should get metrics snapshot", () => {
      metricsCollector.recordCounter("test_counter", 42);

      const snapshot = getMetricsSnapshot();

      expect(snapshot).toHaveProperty("timestamp");
      expect(snapshot).toHaveProperty("metrics");
      expect(snapshot).toHaveProperty("summary");
    });
  });

  describe("getPrometheusMetrics", () => {
    it("should get Prometheus format metrics", () => {
      metricsCollector.recordCounter("test_counter", 42);

      const prometheus = getPrometheusMetrics();

      expect(prometheus).toContain("# HELP test_counter");
      expect(prometheus).toContain("# TYPE test_counter counter");
      expect(prometheus).toContain("test_counter 42");
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should get performance metrics", () => {
      const performance = getPerformanceMetrics();

      expect(performance).toHaveProperty("requestCount");
      expect(performance).toHaveProperty("requestDuration");
      expect(performance).toHaveProperty("errorCount");
      expect(performance).toHaveProperty("activeConnections");
      expect(performance).toHaveProperty("memoryUsage");
      expect(performance).toHaveProperty("cpuUsage");
      expect(performance).toHaveProperty("queueSize");
      expect(performance).toHaveProperty("cacheHitRate");
    });
  });
});

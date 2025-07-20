import { describe, it, expect, beforeEach } from "vitest";
import { MetricsCollector } from "../../metrics";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe("constructor", () => {
    it("should create an empty metrics collector", () => {
      expect(collector).toBeInstanceOf(MetricsCollector);
      expect(collector.getAllMetrics()).toEqual([]);
    });
  });

  describe("increment", () => {
    it("should increment a counter metric", () => {
      collector.increment("test_counter");

      const metric = collector.getMetric("test_counter");
      expect(metric).toBeDefined();
      expect(metric!.type).toBe("counter");
      expect(metric!.values).toHaveLength(1);
      expect(metric!.values[0].value).toBe(1);
    });

    it("should increment by custom value", () => {
      collector.increment("test_counter", 5);

      const metric = collector.getMetric("test_counter");
      expect(metric?.values[0].value).toBe(5);
    });

    it("should increment with tags", () => {
      const tags = { operation: "test", status: "success" };
      collector.increment("test_counter", 1, tags);

      const metric = collector.getMetric("test_counter");
      expect(metric?.values[0].tags).toEqual(tags);
    });

    it("should accumulate multiple increments", () => {
      collector.increment("test_counter", 1);
      collector.increment("test_counter", 2);
      collector.increment("test_counter", 3);

      const metric = collector.getMetric("test_counter");
      expect(metric?.values).toHaveLength(3);
      expect(metric?.values[0].value).toBe(1);
      expect(metric?.values[1].value).toBe(2);
      expect(metric?.values[2].value).toBe(3);
    });

    it("should handle multiple metrics independently", () => {
      collector.increment("counter1", 1);
      collector.increment("counter2", 2);

      const metric1 = collector.getMetric("counter1");
      const metric2 = collector.getMetric("counter2");

      expect(metric1?.values[0].value).toBe(1);
      expect(metric2?.values[0].value).toBe(2);
    });
  });

  describe("gauge", () => {
    it("should set a gauge metric", () => {
      collector.gauge("test_gauge", 42);

      const metric = collector.getMetric("test_gauge");
      expect(metric).toBeDefined();
      expect(metric?.type).toBe("gauge");
      expect(metric?.values).toHaveLength(1);
      expect(metric?.values[0].value).toBe(42);
    });

    it("should set gauge with tags", () => {
      const tags = { worker: "test_worker", status: "running" };
      collector.gauge("test_gauge", 100, tags);

      const metric = collector.getMetric("test_gauge");
      expect(metric?.values[0].tags).toEqual(tags);
    });

    it("should add multiple gauge values", () => {
      collector.gauge("test_gauge", 10);
      collector.gauge("test_gauge", 20);
      collector.gauge("test_gauge", 30);

      const metric = collector.getMetric("test_gauge");
      expect(metric?.values).toHaveLength(3);
      expect(metric?.values[0].value).toBe(10);
      expect(metric?.values[1].value).toBe(20);
      expect(metric?.values[2].value).toBe(30);
    });
  });

  describe("histogram", () => {
    it("should record a histogram value", () => {
      collector.histogram("test_histogram", 150);

      const metric = collector.getMetric("test_histogram");
      expect(metric).toBeDefined();
      expect(metric?.type).toBe("histogram");
      expect(metric?.values).toHaveLength(1);
      expect(metric?.values[0].value).toBe(150);
    });

    it("should record histogram with tags", () => {
      const tags = { action: "parse", success: "true" };
      collector.histogram("test_histogram", 200, tags);

      const metric = collector.getMetric("test_histogram");
      expect(metric?.values[0].tags).toEqual(tags);
    });

    it("should add multiple histogram values", () => {
      collector.histogram("test_histogram", 100);
      collector.histogram("test_histogram", 200);
      collector.histogram("test_histogram", 300);

      const metric = collector.getMetric("test_histogram");
      expect(metric?.values).toHaveLength(3);
      expect(metric?.values[0].value).toBe(100);
      expect(metric?.values[1].value).toBe(200);
      expect(metric?.values[2].value).toBe(300);
    });
  });

  describe("getMetric", () => {
    it("should return undefined for non-existent metric", () => {
      const metric = collector.getMetric("non_existent");
      expect(metric).toBeUndefined();
    });

    it("should return the correct metric", () => {
      collector.increment("test_counter", 1);

      const metric = collector.getMetric("test_counter");
      expect(metric?.name).toBe("test_counter");
      expect(metric?.type).toBe("counter");
    });
  });

  describe("getAllMetrics", () => {
    it("should return empty array for new collector", () => {
      const metrics = collector.getAllMetrics();
      expect(metrics).toEqual([]);
    });

    it("should return all metrics", () => {
      collector.increment("counter1", 1);
      collector.gauge("gauge1", 10);
      collector.histogram("histogram1", 100);

      const metrics = collector.getAllMetrics();
      expect(metrics).toHaveLength(3);

      const metricNames = metrics.map((m) => m.name).sort();
      expect(metricNames).toEqual(["counter1", "gauge1", "histogram1"]);
    });
  });

  describe("clearOldMetrics", () => {
    it("should keep all metrics when under limit", () => {
      collector.increment("test_counter", 1);
      collector.increment("test_counter", 2);
      collector.increment("test_counter", 3);

      collector.clearOldMetrics(5);

      const metric = collector.getMetric("test_counter");
      expect(metric?.values).toHaveLength(3);
    });

    it("should remove old metrics when over limit", () => {
      // Add 10 values
      for (let i = 1; i <= 10; i++) {
        collector.increment("test_counter", i);
      }

      // Clear to keep only last 5
      collector.clearOldMetrics(5);

      const metric = collector.getMetric("test_counter");
      expect(metric?.values).toHaveLength(5);
      expect(metric?.values[0].value).toBe(6);
      expect(metric?.values[4].value).toBe(10);
    });

    it("should use default limit of 100", () => {
      // Add 150 values
      for (let i = 1; i <= 150; i++) {
        collector.increment("test_counter", i);
      }

      collector.clearOldMetrics();

      const metric = collector.getMetric("test_counter");
      expect(metric?.values).toHaveLength(100);
      expect(metric?.values[0].value).toBe(51);
      expect(metric?.values[99].value).toBe(150);
    });

    it("should clear old metrics for all metric types", () => {
      // Add values to different metric types
      for (let i = 1; i <= 10; i++) {
        collector.increment("counter", i);
        collector.gauge("gauge", i * 10);
        collector.histogram("histogram", i * 100);
      }

      collector.clearOldMetrics(3);

      expect(collector.getMetric("counter")?.values).toHaveLength(3);
      expect(collector.getMetric("gauge")?.values).toHaveLength(3);
      expect(collector.getMetric("histogram")?.values).toHaveLength(3);
    });
  });

  describe("getMetricSummary", () => {
    it("should return null for non-existent metric", () => {
      const summary = collector.getMetricSummary("non_existent");
      expect(summary).toBeNull();
    });

    it("should return null for empty metric", () => {
      collector.increment("empty_counter", 0);
      collector.clearOldMetrics(0);

      const summary = collector.getMetricSummary("empty_counter");
      expect(summary).toBeNull();
    });

    it("should calculate summary for single value", () => {
      collector.increment("test_counter", 42);

      const summary = collector.getMetricSummary("test_counter");
      expect(summary).toEqual({
        count: 1,
        sum: 42,
        avg: 42,
        min: 42,
        max: 42,
        latest: 42,
      });
    });

    it("should calculate summary for multiple values", () => {
      collector.increment("test_counter", 10);
      collector.increment("test_counter", 20);
      collector.increment("test_counter", 30);

      const summary = collector.getMetricSummary("test_counter");
      expect(summary).toEqual({
        count: 3,
        sum: 60,
        avg: 20,
        min: 10,
        max: 30,
        latest: 30,
      });
    });

    it("should handle negative values", () => {
      collector.increment("test_counter", -10);
      collector.increment("test_counter", 0);
      collector.increment("test_counter", 10);

      const summary = collector.getMetricSummary("test_counter");
      expect(summary).toEqual({
        count: 3,
        sum: 0,
        avg: 0,
        min: -10,
        max: 10,
        latest: 10,
      });
    });

    it("should handle decimal values", () => {
      collector.gauge("test_gauge", 1.5);
      collector.gauge("test_gauge", 2.5);
      collector.gauge("test_gauge", 3.5);

      const summary = collector.getMetricSummary("test_gauge");
      expect(summary).toEqual({
        count: 3,
        sum: 7.5,
        avg: 2.5,
        min: 1.5,
        max: 3.5,
        latest: 3.5,
      });
    });
  });

  describe("timestamp handling", () => {
    it("should include timestamps in metric values", () => {
      const before = Date.now();
      collector.increment("test_counter", 1);
      const after = Date.now();

      const metric = collector.getMetric("test_counter");
      const timestamp = metric?.values[0].timestamp;

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("should have different timestamps for different values", () => {
      collector.increment("test_counter", 1);

      // Small delay
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      return delay(10).then(() => {
        collector.increment("test_counter", 2);

        const metric = collector.getMetric("test_counter");
        const timestamp1 = metric?.values[0].timestamp;
        const timestamp2 = metric?.values[1].timestamp;

        expect(timestamp2).toBeGreaterThan(timestamp1);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle zero values", () => {
      collector.increment("test_counter", 0);
      collector.gauge("test_gauge", 0);
      collector.histogram("test_histogram", 0);

      expect(collector.getMetric("test_counter")?.values[0].value).toBe(0);
      expect(collector.getMetric("test_gauge")?.values[0].value).toBe(0);
      expect(collector.getMetric("test_histogram")?.values[0].value).toBe(0);
    });

    it("should handle very large values", () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      collector.increment("test_counter", largeValue);

      const metric = collector.getMetric("test_counter");
      expect(metric?.values[0].value).toBe(largeValue);
    });

    it("should handle empty tags", () => {
      collector.increment("test_counter", 1, {});

      const metric = collector.getMetric("test_counter");
      expect(metric?.values[0].tags).toEqual({});
    });

    it("should handle undefined tags", () => {
      collector.increment("test_counter", 1, undefined);

      const metric = collector.getMetric("test_counter");
      expect(metric?.values[0].tags).toBeUndefined();
    });
  });
});

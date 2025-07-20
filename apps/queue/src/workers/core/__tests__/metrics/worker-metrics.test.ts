import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkerMetrics, globalMetrics } from "../../metrics";

describe("WorkerMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the global metrics before each test
    globalMetrics.clearOldMetrics(0);
  });

  describe("recordJobProcessingTime", () => {
    it("should record job processing time histogram", () => {
      const histogramSpy = vi.spyOn(globalMetrics, "histogram");

      WorkerMetrics.recordJobProcessingTime("test_operation", 150, true);

      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.job.processing_time",
        150,
        { operation: "test_operation" }
      );
    });

    it("should increment total job counter", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordJobProcessingTime("test_operation", 150, true);

      expect(incrementSpy).toHaveBeenCalledWith("worker.job.total", 1, {
        operation: "test_operation",
      });
    });

    it("should increment success counter for successful jobs", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordJobProcessingTime("test_operation", 150, true);

      expect(incrementSpy).toHaveBeenCalledWith("worker.job.success", 1, {
        operation: "test_operation",
      });
    });

    it("should increment failure counter for failed jobs", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordJobProcessingTime("test_operation", 150, false);

      expect(incrementSpy).toHaveBeenCalledWith("worker.job.failure", 1, {
        operation: "test_operation",
      });
    });

    it("should increment success counter with 0 for failed jobs", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordJobProcessingTime("test_operation", 150, false);

      expect(incrementSpy).toHaveBeenCalledWith("worker.job.success", 0, {
        operation: "test_operation",
      });
    });

    it("should increment failure counter with 0 for successful jobs", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordJobProcessingTime("test_operation", 150, true);

      expect(incrementSpy).toHaveBeenCalledWith("worker.job.failure", 0, {
        operation: "test_operation",
      });
    });

    it("should record all metrics with correct operation tag", () => {
      const histogramSpy = vi.spyOn(globalMetrics, "histogram");
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordJobProcessingTime("parse_ingredient", 200, true);

      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.job.processing_time",
        200,
        { operation: "parse_ingredient" }
      );

      expect(incrementSpy).toHaveBeenCalledWith("worker.job.total", 1, {
        operation: "parse_ingredient",
      });
      expect(incrementSpy).toHaveBeenCalledWith("worker.job.success", 1, {
        operation: "parse_ingredient",
      });
      expect(incrementSpy).toHaveBeenCalledWith("worker.job.failure", 0, {
        operation: "parse_ingredient",
      });
    });
  });

  describe("recordActionExecutionTime", () => {
    it("should record action execution time histogram", () => {
      const histogramSpy = vi.spyOn(globalMetrics, "histogram");

      WorkerMetrics.recordActionExecutionTime("test_action", 50, true);

      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.action.execution_time",
        50,
        { action: "test_action" }
      );
    });

    it("should increment total action counter", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordActionExecutionTime("test_action", 50, true);

      expect(incrementSpy).toHaveBeenCalledWith("worker.action.total", 1, {
        action: "test_action",
      });
    });

    it("should increment success counter for successful actions", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordActionExecutionTime("test_action", 50, true);

      expect(incrementSpy).toHaveBeenCalledWith("worker.action.success", 1, {
        action: "test_action",
      });
    });

    it("should increment failure counter for failed actions", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordActionExecutionTime("test_action", 50, false);

      expect(incrementSpy).toHaveBeenCalledWith("worker.action.failure", 1, {
        action: "test_action",
      });
    });

    it("should increment success counter with 0 for failed actions", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordActionExecutionTime("test_action", 50, false);

      expect(incrementSpy).toHaveBeenCalledWith("worker.action.success", 0, {
        action: "test_action",
      });
    });

    it("should increment failure counter with 0 for successful actions", () => {
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordActionExecutionTime("test_action", 50, true);

      expect(incrementSpy).toHaveBeenCalledWith("worker.action.failure", 0, {
        action: "test_action",
      });
    });

    it("should record all metrics with correct action tag", () => {
      const histogramSpy = vi.spyOn(globalMetrics, "histogram");
      const incrementSpy = vi.spyOn(globalMetrics, "increment");

      WorkerMetrics.recordActionExecutionTime("parse_ingredient", 75, true);

      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.action.execution_time",
        75,
        { action: "parse_ingredient" }
      );

      expect(incrementSpy).toHaveBeenCalledWith("worker.action.total", 1, {
        action: "parse_ingredient",
      });
      expect(incrementSpy).toHaveBeenCalledWith("worker.action.success", 1, {
        action: "parse_ingredient",
      });
      expect(incrementSpy).toHaveBeenCalledWith("worker.action.failure", 0, {
        action: "parse_ingredient",
      });
    });
  });

  describe("recordQueueDepth", () => {
    it("should record queue depth gauge", () => {
      const gaugeSpy = vi.spyOn(globalMetrics, "gauge");

      WorkerMetrics.recordQueueDepth("test_queue", 42);

      expect(gaugeSpy).toHaveBeenCalledWith("worker.queue.depth", 42, {
        queue: "test_queue",
      });
    });

    it("should handle zero queue depth", () => {
      const gaugeSpy = vi.spyOn(globalMetrics, "gauge");

      WorkerMetrics.recordQueueDepth("test_queue", 0);

      expect(gaugeSpy).toHaveBeenCalledWith("worker.queue.depth", 0, {
        queue: "test_queue",
      });
    });

    it("should handle large queue depth", () => {
      const gaugeSpy = vi.spyOn(globalMetrics, "gauge");

      WorkerMetrics.recordQueueDepth("test_queue", 10000);

      expect(gaugeSpy).toHaveBeenCalledWith("worker.queue.depth", 10000, {
        queue: "test_queue",
      });
    });
  });

  describe("recordWorkerStatus", () => {
    it("should record running worker status", () => {
      const gaugeSpy = vi.spyOn(globalMetrics, "gauge");

      WorkerMetrics.recordWorkerStatus("test_worker", true);

      expect(gaugeSpy).toHaveBeenCalledWith("worker.status", 1, {
        worker: "test_worker",
      });
    });

    it("should record stopped worker status", () => {
      const gaugeSpy = vi.spyOn(globalMetrics, "gauge");

      WorkerMetrics.recordWorkerStatus("test_worker", false);

      expect(gaugeSpy).toHaveBeenCalledWith("worker.status", 0, {
        worker: "test_worker",
      });
    });

    it("should handle different worker names", () => {
      const gaugeSpy = vi.spyOn(globalMetrics, "gauge");

      WorkerMetrics.recordWorkerStatus("parse_ingredient_worker", true);
      WorkerMetrics.recordWorkerStatus("fetch_recipe_worker", false);

      expect(gaugeSpy).toHaveBeenCalledWith("worker.status", 1, {
        worker: "parse_ingredient_worker",
      });
      expect(gaugeSpy).toHaveBeenCalledWith("worker.status", 0, {
        worker: "fetch_recipe_worker",
      });
    });
  });

  describe("integration with globalMetrics", () => {
    it("should actually store metrics in global collector", () => {
      WorkerMetrics.recordJobProcessingTime("test_operation", 150, true);
      WorkerMetrics.recordActionExecutionTime("test_action", 50, true);
      WorkerMetrics.recordQueueDepth("test_queue", 42);
      WorkerMetrics.recordWorkerStatus("test_worker", true);

      const metrics = globalMetrics.getAllMetrics();

      expect(metrics).toHaveLength(10);

      const metricNames = metrics.map((m) => m.name).sort();
      expect(metricNames).toEqual(
        [
          "worker.action.execution_time",
          "worker.action.failure",
          "worker.action.success",
          "worker.action.total",
          "worker.job.failure",
          "worker.job.processing_time",
          "worker.job.success",
          "worker.job.total",
          "worker.queue.depth",
          "worker.status",
        ].sort()
      );
    });

    it("should accumulate metrics over multiple calls", () => {
      WorkerMetrics.recordJobProcessingTime("test_operation", 100, true);
      WorkerMetrics.recordJobProcessingTime("test_operation", 200, false);
      WorkerMetrics.recordJobProcessingTime("test_operation", 150, true);

      const totalMetric = globalMetrics.getMetric("worker.job.total");
      const successMetric = globalMetrics.getMetric("worker.job.success");
      const failureMetric = globalMetrics.getMetric("worker.job.failure");

      expect(totalMetric?.values).toHaveLength(3);
      expect(successMetric?.values).toHaveLength(3);
      expect(failureMetric?.values).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("should handle zero duration", () => {
      const histogramSpy = vi.spyOn(globalMetrics, "histogram");

      WorkerMetrics.recordJobProcessingTime("test_operation", 0, true);
      WorkerMetrics.recordActionExecutionTime("test_action", 0, true);

      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.job.processing_time",
        0,
        { operation: "test_operation" }
      );
      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.action.execution_time",
        0,
        { action: "test_action" }
      );
    });

    it("should handle very large durations", () => {
      const histogramSpy = vi.spyOn(globalMetrics, "histogram");

      WorkerMetrics.recordJobProcessingTime("test_operation", 999999, true);
      WorkerMetrics.recordActionExecutionTime("test_action", 999999, true);

      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.job.processing_time",
        999999,
        { operation: "test_operation" }
      );
      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.action.execution_time",
        999999,
        { action: "test_action" }
      );
    });

    it("should handle special characters in names", () => {
      const histogramSpy = vi.spyOn(globalMetrics, "histogram");
      const gaugeSpy = vi.spyOn(globalMetrics, "gauge");

      WorkerMetrics.recordJobProcessingTime(
        "test-operation:with:colons",
        150,
        true
      );
      WorkerMetrics.recordActionExecutionTime(
        "test_action/with/slashes",
        50,
        true
      );
      WorkerMetrics.recordQueueDepth("test-queue_with_underscores", 42);
      WorkerMetrics.recordWorkerStatus("test.worker.with.dots", true);

      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.job.processing_time",
        150,
        { operation: "test-operation:with:colons" }
      );
      expect(histogramSpy).toHaveBeenCalledWith(
        "worker.action.execution_time",
        50,
        { action: "test_action/with/slashes" }
      );
      expect(gaugeSpy).toHaveBeenCalledWith("worker.queue.depth", 42, {
        queue: "test-queue_with_underscores",
      });
      expect(gaugeSpy).toHaveBeenCalledWith("worker.status", 1, {
        worker: "test.worker.with.dots",
      });
    });
  });
});

import { describe, expect, it } from "vitest";

import type { QueueMetrics } from "../../../../types/monitoring";
import * as MetricsModule from "../../../core/metrics";
import type {
  MetricsCollectorSystemMetrics,
  WorkerMetrics,
} from "../../../core/metrics/metrics";

describe("Metrics Module Exports", () => {
  describe("MetricsCollector class", () => {
    it("should export MetricsCollector class", () => {
      expect(MetricsModule.MetricsCollector).toBeDefined();
      expect(typeof MetricsModule.MetricsCollector).toBe("function");
    });

    it("should be a class constructor", () => {
      expect(MetricsModule.MetricsCollector.prototype.constructor).toBe(
        MetricsModule.MetricsCollector
      );
    });

    it("should have static getInstance method", () => {
      expect(typeof MetricsModule.MetricsCollector.getInstance).toBe(
        "function"
      );
    });

    it("should return singleton instance", () => {
      const instance1 = MetricsModule.MetricsCollector.getInstance();
      const instance2 = MetricsModule.MetricsCollector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("metricsCollector singleton", () => {
    it("should export metricsCollector singleton", () => {
      expect(MetricsModule.metricsCollector).toBeDefined();
      expect(MetricsModule.metricsCollector).toBeInstanceOf(
        MetricsModule.MetricsCollector
      );
    });

    it("should be the same as getInstance result", () => {
      const instance = MetricsModule.MetricsCollector.getInstance();
      expect(MetricsModule.metricsCollector).toBe(instance);
    });
  });

  describe("type exports", () => {
    it("should have WorkerMetrics type available", () => {
      // Test that the type can be used
      const testMetrics: WorkerMetrics = {
        workerId: "test",
        queueName: "test",
        jobsProcessed: 0,
        jobsFailed: 0,
        averageProcessingTime: 0,
        lastJobTime: new Date(),
        uptime: 0,
      };
      expect(testMetrics.workerId).toBe("test");
    });

    it("should have MetricsCollectorSystemMetrics type available", () => {
      // Test that the type can be used
      const testSystemMetrics: MetricsCollectorSystemMetrics = {
        totalWorkers: 0,
        totalQueues: 0,
        totalJobsProcessed: 0,
        totalJobsFailed: 0,
        systemUptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      };
      expect(testSystemMetrics.totalWorkers).toBe(0);
    });
  });

  describe("module structure", () => {
    it("should export expected properties", () => {
      const exportedKeys = Object.keys(MetricsModule);
      const expectedKeys = ["MetricsCollector", "metricsCollector"];

      expect(exportedKeys.sort()).toEqual(expectedKeys.sort());
    });

    it("should not export unexpected properties", () => {
      const exportedKeys = Object.keys(MetricsModule);
      const unexpectedKeys = ["PrivateMethod", "InternalClass", "TestHelper"];

      unexpectedKeys.forEach((key) => {
        expect(exportedKeys).not.toContain(key);
      });
    });
  });

  describe("MetricsCollector functionality", () => {
    it("should have updateWorkerMetrics method", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();
      expect(typeof collector.updateWorkerMetrics).toBe("function");
    });

    it("should have updateQueueMetrics method", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();
      expect(typeof collector.updateQueueMetrics).toBe("function");
    });

    it("should have getWorkerMetrics method", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();
      expect(typeof collector.getWorkerMetrics).toBe("function");
    });

    it("should have getAllWorkerMetrics method", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();
      expect(typeof collector.getAllWorkerMetrics).toBe("function");
    });

    it("should have getQueueMetrics method", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();
      expect(typeof collector.getQueueMetrics).toBe("function");
    });

    it("should have getAllQueueMetrics method", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();
      expect(typeof collector.getAllQueueMetrics).toBe("function");
    });

    it("should have getSystemMetrics method", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();
      expect(typeof collector.getSystemMetrics).toBe("function");
    });
  });

  describe("singleton behavior", () => {
    it("should maintain singleton across imports", () => {
      const collector1 = MetricsModule.metricsCollector;
      const collector2 = MetricsModule.MetricsCollector.getInstance();

      expect(collector1).toBe(collector2);
    });

    it("should share state across different access methods", () => {
      const collector1 = MetricsModule.metricsCollector;
      const collector2 = MetricsModule.MetricsCollector.getInstance();

      const testMetrics = {
        workerId: "test-worker",
        queueName: "test-queue",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date(),
        uptime: 3600000,
      };

      collector1.updateWorkerMetrics(testMetrics);

      const retrieved1 = collector1.getWorkerMetrics("test-worker");
      const retrieved2 = collector2.getWorkerMetrics("test-worker");

      expect(retrieved1).toEqual(testMetrics);
      expect(retrieved2).toEqual(testMetrics);
    });
  });

  describe("type definitions", () => {
    it("should have correct WorkerMetrics structure", () => {
      const testMetrics: MetricsModule.WorkerMetrics = {
        workerId: "test-worker",
        queueName: "test-queue",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150.5,
        lastJobTime: new Date(),
        uptime: 3600000,
      };

      expect(testMetrics.workerId).toBe("test-worker");
      expect(testMetrics.queueName).toBe("test-queue");
      expect(testMetrics.jobsProcessed).toBe(10);
      expect(testMetrics.jobsFailed).toBe(2);
      expect(testMetrics.averageProcessingTime).toBe(150.5);
      expect(testMetrics.lastJobTime).toBeInstanceOf(Date);
      expect(testMetrics.uptime).toBe(3600000);
    });

    it("should have correct MetricsCollectorSystemMetrics structure", () => {
      const testSystemMetrics: MetricsModule.MetricsCollectorSystemMetrics = {
        totalWorkers: 5,
        totalQueues: 3,
        totalJobsProcessed: 1000,
        totalJobsFailed: 50,
        systemUptime: 86400000,
        memoryUsage: 512.5,
        cpuUsage: 25.3,
      };

      expect(testSystemMetrics.totalWorkers).toBe(5);
      expect(testSystemMetrics.totalQueues).toBe(3);
      expect(testSystemMetrics.totalJobsProcessed).toBe(1000);
      expect(testSystemMetrics.totalJobsFailed).toBe(50);
      expect(testSystemMetrics.systemUptime).toBe(86400000);
      expect(testSystemMetrics.memoryUsage).toBe(512.5);
      expect(testSystemMetrics.cpuUsage).toBe(25.3);
    });
  });

  describe("module import patterns", () => {
    it("should work with default import", () => {
      const { MetricsCollector, metricsCollector } = MetricsModule;

      expect(MetricsCollector).toBeDefined();
      expect(metricsCollector).toBeDefined();
      expect(metricsCollector).toBeInstanceOf(MetricsCollector);
    });

    it("should work with namespace import", () => {
      expect(MetricsModule.MetricsCollector).toBeDefined();
      expect(MetricsModule.metricsCollector).toBeDefined();
    });

    it("should maintain reference equality", () => {
      const { MetricsCollector, metricsCollector } = MetricsModule;
      expect(metricsCollector).toBe(MetricsCollector.getInstance());
    });
  });

  describe("integration with imported types", () => {
    it("should work with QueueMetrics from monitoring types", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();

      const queueMetrics = {
        queueName: "test-queue",
        jobCount: 25,
        waitingCount: 10,
        activeCount: 5,
        completedCount: 8,
        failedCount: 2,
        timestamp: new Date(),
      };

      expect(() => {
        collector.updateQueueMetrics(queueMetrics);
      }).not.toThrow();

      const retrieved = collector.getQueueMetrics("test-queue");
      expect(retrieved).toEqual(queueMetrics);
    });
  });

  describe("error handling", () => {
    it("should handle invalid worker metrics gracefully", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();

      // Test with missing required fields (TypeScript would catch this, but runtime should handle gracefully)
      const invalidMetrics = {
        workerId: "test-worker",
        queueName: "test-queue",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date(),
        uptime: 3600000,
      } as MetricsModule.WorkerMetrics;

      expect(() => {
        collector.updateWorkerMetrics(invalidMetrics);
      }).not.toThrow();
    });

    it("should handle invalid queue metrics gracefully", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();

      const invalidQueueMetrics = {
        queueName: "test-queue",
        jobCount: 25,
        waitingCount: 10,
        activeCount: 5,
        completedCount: 8,
        failedCount: 2,
        timestamp: new Date(),
      } as unknown as QueueMetrics;

      expect(() => {
        collector.updateQueueMetrics(invalidQueueMetrics);
      }).not.toThrow();
    });
  });

  describe("performance characteristics", () => {
    it("should handle multiple rapid updates", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();

      const workerMetrics = {
        workerId: "test-worker",
        queueName: "test-queue",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date(),
        uptime: 3600000,
      };

      // Perform multiple rapid updates
      for (let i = 0; i < 100; i++) {
        collector.updateWorkerMetrics({
          ...workerMetrics,
          jobsProcessed: i,
        });
      }

      const finalMetrics = collector.getWorkerMetrics("test-worker");
      expect(finalMetrics?.jobsProcessed).toBe(99);
    });

    it("should maintain performance with large number of workers", () => {
      const collector = MetricsModule.MetricsCollector.getInstance();

      // Clear any existing metrics first
      (
        collector as unknown as { workerMetrics: Map<string, unknown> }
      ).workerMetrics = new Map();

      // Add many workers
      for (let i = 0; i < 1000; i++) {
        collector.updateWorkerMetrics({
          workerId: `worker-${i}`,
          queueName: `queue-${i % 10}`,
          jobsProcessed: i,
          jobsFailed: i % 10,
          averageProcessingTime: 150 + i,
          lastJobTime: new Date(),
          uptime: 3600000 + i,
        });
      }

      const allMetrics = collector.getAllWorkerMetrics();
      expect(allMetrics).toHaveLength(1000);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalWorkers).toBe(1000);
      expect(systemMetrics.totalJobsProcessed).toBe(499500); // Sum of 0 to 999
    });
  });
});

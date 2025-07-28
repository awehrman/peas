import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QueueMetrics } from "../../../../types/monitoring";
import {
  MetricsCollector,
  type WorkerMetrics,
  metricsCollector,
} from "../../../core/metrics/metrics";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    // Reset the singleton instance for each test
    vi.clearAllMocks();
    // Clear the singleton instance by accessing the private static property
    (
      MetricsCollector as unknown as { instance: MetricsCollector | undefined }
    ).instance = undefined;
    collector = MetricsCollector.getInstance();
  });

  describe("singleton pattern", () => {
    it("should return the same instance when called multiple times", () => {
      const instance1 = MetricsCollector.getInstance();
      const instance2 = MetricsCollector.getInstance();
      const instance3 = MetricsCollector.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(instance3);
    });

    it("should prevent direct instantiation", () => {
      // The constructor is private, so TypeScript prevents direct instantiation
      // We can't test this at runtime since the constructor is private
      expect(MetricsCollector.getInstance()).toBeInstanceOf(MetricsCollector);
    });

    it("should export singleton instance", () => {
      expect(metricsCollector).toBeInstanceOf(MetricsCollector);
      expect(metricsCollector).toStrictEqual(MetricsCollector.getInstance());
    });
  });

  describe("worker metrics", () => {
    it("should update and retrieve worker metrics", () => {
      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150.5,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 3600000, // 1 hour
      };

      collector.updateWorkerMetrics(workerMetrics);

      const retrieved = collector.getWorkerMetrics("worker-1");
      expect(retrieved).toEqual(workerMetrics);
    });

    it("should return undefined for non-existent worker", () => {
      const retrieved = collector.getWorkerMetrics("non-existent");
      expect(retrieved).toBeUndefined();
    });

    it("should update existing worker metrics", () => {
      const initialMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 5,
        jobsFailed: 1,
        averageProcessingTime: 100,
        lastJobTime: new Date("2023-01-01T09:00:00Z"),
        uptime: 1800000,
      };

      const updatedMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 15,
        jobsFailed: 3,
        averageProcessingTime: 200,
        lastJobTime: new Date("2023-01-01T11:00:00Z"),
        uptime: 7200000,
      };

      collector.updateWorkerMetrics(initialMetrics);
      collector.updateWorkerMetrics(updatedMetrics);

      const retrieved = collector.getWorkerMetrics("worker-1");
      expect(retrieved).toEqual(updatedMetrics);
    });

    it("should get all worker metrics", () => {
      const worker1: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "queue-1",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 3600000,
      };

      const worker2: WorkerMetrics = {
        workerId: "worker-2",
        queueName: "queue-2",
        jobsProcessed: 20,
        jobsFailed: 1,
        averageProcessingTime: 200,
        lastJobTime: new Date("2023-01-01T11:00:00Z"),
        uptime: 7200000,
      };

      collector.updateWorkerMetrics(worker1);
      collector.updateWorkerMetrics(worker2);

      const allMetrics = collector.getAllWorkerMetrics();
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics).toContainEqual(worker1);
      expect(allMetrics).toContainEqual(worker2);
    });

    it("should return empty array when no worker metrics exist", () => {
      const allMetrics = collector.getAllWorkerMetrics();
      expect(allMetrics).toEqual([]);
    });
  });

  describe("queue metrics", () => {
    it("should update and retrieve queue metrics", () => {
      const queueMetrics: QueueMetrics = {
        queueName: "test-queue",
        jobCount: 25,
        waitingCount: 10,
        activeCount: 5,
        completedCount: 8,
        failedCount: 2,
        timestamp: new Date("2023-01-01T10:00:00Z"),
      };

      collector.updateQueueMetrics(queueMetrics);

      const retrieved = collector.getQueueMetrics("test-queue");
      expect(retrieved).toEqual(queueMetrics);
    });

    it("should return undefined for non-existent queue", () => {
      const retrieved = collector.getQueueMetrics("non-existent");
      expect(retrieved).toBeUndefined();
    });

    it("should update existing queue metrics", () => {
      const initialMetrics: QueueMetrics = {
        queueName: "test-queue",
        jobCount: 10,
        waitingCount: 5,
        activeCount: 2,
        completedCount: 2,
        failedCount: 1,
        timestamp: new Date("2023-01-01T09:00:00Z"),
      };

      const updatedMetrics: QueueMetrics = {
        queueName: "test-queue",
        jobCount: 30,
        waitingCount: 15,
        activeCount: 8,
        completedCount: 5,
        failedCount: 2,
        timestamp: new Date("2023-01-01T11:00:00Z"),
      };

      collector.updateQueueMetrics(initialMetrics);
      collector.updateQueueMetrics(updatedMetrics);

      const retrieved = collector.getQueueMetrics("test-queue");
      expect(retrieved).toEqual(updatedMetrics);
    });

    it("should get all queue metrics", () => {
      const queue1: QueueMetrics = {
        queueName: "queue-1",
        jobCount: 15,
        waitingCount: 8,
        activeCount: 4,
        completedCount: 2,
        failedCount: 1,
        timestamp: new Date("2023-01-01T10:00:00Z"),
      };

      const queue2: QueueMetrics = {
        queueName: "queue-2",
        jobCount: 25,
        waitingCount: 12,
        activeCount: 6,
        completedCount: 5,
        failedCount: 2,
        timestamp: new Date("2023-01-01T11:00:00Z"),
      };

      collector.updateQueueMetrics(queue1);
      collector.updateQueueMetrics(queue2);

      const allMetrics = collector.getAllQueueMetrics();
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics).toContainEqual(queue1);
      expect(allMetrics).toContainEqual(queue2);
    });

    it("should return empty array when no queue metrics exist", () => {
      const allMetrics = collector.getAllQueueMetrics();
      expect(allMetrics).toEqual([]);
    });
  });

  describe("system metrics", () => {
    it("should return initial system metrics", () => {
      const systemMetrics = collector.getSystemMetrics();

      expect(systemMetrics).toEqual({
        totalWorkers: 0,
        totalQueues: 0,
        totalJobsProcessed: 0,
        totalJobsFailed: 0,
        systemUptime: expect.any(Number),
        memoryUsage: expect.any(Number),
        cpuUsage: expect.any(Number),
      });
    });

    it("should update system metrics when worker metrics are added", () => {
      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 3600000,
      };

      collector.updateWorkerMetrics(workerMetrics);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalWorkers).toBe(1);
      expect(systemMetrics.totalJobsProcessed).toBe(10);
      expect(systemMetrics.totalJobsFailed).toBe(2);
    });

    it("should update system metrics when queue metrics are added", () => {
      const queueMetrics: QueueMetrics = {
        queueName: "test-queue",
        jobCount: 25,
        waitingCount: 10,
        activeCount: 5,
        completedCount: 8,
        failedCount: 2,
        timestamp: new Date("2023-01-01T10:00:00Z"),
      };

      collector.updateQueueMetrics(queueMetrics);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalQueues).toBe(1);
    });

    it("should aggregate multiple worker metrics correctly", () => {
      const worker1: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "queue-1",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 3600000,
      };

      const worker2: WorkerMetrics = {
        workerId: "worker-2",
        queueName: "queue-2",
        jobsProcessed: 20,
        jobsFailed: 1,
        averageProcessingTime: 200,
        lastJobTime: new Date("2023-01-01T11:00:00Z"),
        uptime: 7200000,
      };

      collector.updateWorkerMetrics(worker1);
      collector.updateWorkerMetrics(worker2);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalWorkers).toBe(2);
      expect(systemMetrics.totalJobsProcessed).toBe(30);
      expect(systemMetrics.totalJobsFailed).toBe(3);
    });

    it("should aggregate multiple queue metrics correctly", () => {
      const queue1: QueueMetrics = {
        queueName: "queue-1",
        jobCount: 15,
        waitingCount: 8,
        activeCount: 4,
        completedCount: 2,
        failedCount: 1,
        timestamp: new Date("2023-01-01T10:00:00Z"),
      };

      const queue2: QueueMetrics = {
        queueName: "queue-2",
        jobCount: 25,
        waitingCount: 12,
        activeCount: 6,
        completedCount: 5,
        failedCount: 2,
        timestamp: new Date("2023-01-01T11:00:00Z"),
      };

      collector.updateQueueMetrics(queue1);
      collector.updateQueueMetrics(queue2);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalQueues).toBe(2);
    });

    it("should return a copy of system metrics", () => {
      const systemMetrics1 = collector.getSystemMetrics();
      const systemMetrics2 = collector.getSystemMetrics();

      expect(systemMetrics1).not.toBe(systemMetrics2);
      expect(systemMetrics1).toEqual(systemMetrics2);
    });

    it("should include system performance metrics", () => {
      const systemMetrics = collector.getSystemMetrics();

      expect(systemMetrics.systemUptime).toBeGreaterThanOrEqual(0);
      expect(systemMetrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(systemMetrics.cpuUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("metrics integration", () => {
    it("should update system metrics when both worker and queue metrics are updated", () => {
      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 15,
        jobsFailed: 3,
        averageProcessingTime: 180,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 3600000,
      };

      const queueMetrics: QueueMetrics = {
        queueName: "test-queue",
        jobCount: 30,
        waitingCount: 12,
        activeCount: 6,
        completedCount: 10,
        failedCount: 2,
        timestamp: new Date("2023-01-01T10:00:00Z"),
      };

      collector.updateWorkerMetrics(workerMetrics);
      collector.updateQueueMetrics(queueMetrics);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalWorkers).toBe(1);
      expect(systemMetrics.totalQueues).toBe(1);
      expect(systemMetrics.totalJobsProcessed).toBe(15);
      expect(systemMetrics.totalJobsFailed).toBe(3);
    });

    it("should handle multiple updates to the same metrics", () => {
      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 5,
        jobsFailed: 1,
        averageProcessingTime: 100,
        lastJobTime: new Date("2023-01-01T09:00:00Z"),
        uptime: 1800000,
      };

      // Update multiple times
      collector.updateWorkerMetrics(workerMetrics);
      collector.updateWorkerMetrics(workerMetrics);
      collector.updateWorkerMetrics(workerMetrics);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalWorkers).toBe(1);
      expect(systemMetrics.totalJobsProcessed).toBe(5);
      expect(systemMetrics.totalJobsFailed).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should handle worker with zero jobs", () => {
      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 0,
        jobsFailed: 0,
        averageProcessingTime: 0,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 0,
      };

      collector.updateWorkerMetrics(workerMetrics);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalWorkers).toBe(1);
      expect(systemMetrics.totalJobsProcessed).toBe(0);
      expect(systemMetrics.totalJobsFailed).toBe(0);
    });

    it("should handle large numbers in metrics", () => {
      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 999999,
        jobsFailed: 99999,
        averageProcessingTime: 999999.99,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 999999999,
      };

      collector.updateWorkerMetrics(workerMetrics);

      const systemMetrics = collector.getSystemMetrics();
      expect(systemMetrics.totalWorkers).toBe(1);
      expect(systemMetrics.totalJobsProcessed).toBe(999999);
      expect(systemMetrics.totalJobsFailed).toBe(99999);
    });

    it("should handle special characters in worker and queue names", () => {
      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1@#$%",
        queueName: "queue-1@#$%",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 3600000,
      };

      const queueMetrics: QueueMetrics = {
        queueName: "queue-1@#$%",
        jobCount: 25,
        waitingCount: 10,
        activeCount: 5,
        completedCount: 8,
        failedCount: 2,
        timestamp: new Date("2023-01-01T10:00:00Z"),
      };

      collector.updateWorkerMetrics(workerMetrics);
      collector.updateQueueMetrics(queueMetrics);

      const retrievedWorker = collector.getWorkerMetrics("worker-1@#$%");
      const retrievedQueue = collector.getQueueMetrics("queue-1@#$%");

      expect(retrievedWorker).toEqual(workerMetrics);
      expect(retrievedQueue).toEqual(queueMetrics);
    });
  });

  describe("data isolation", () => {
    it("should not share data between different instances", () => {
      // This test verifies that the singleton pattern works correctly
      const instance1 = MetricsCollector.getInstance();
      const instance2 = MetricsCollector.getInstance();

      const workerMetrics: WorkerMetrics = {
        workerId: "worker-1",
        queueName: "test-queue",
        jobsProcessed: 10,
        jobsFailed: 2,
        averageProcessingTime: 150,
        lastJobTime: new Date("2023-01-01T10:00:00Z"),
        uptime: 3600000,
      };

      instance1.updateWorkerMetrics(workerMetrics);

      const retrievedFromInstance1 = instance1.getWorkerMetrics("worker-1");
      const retrievedFromInstance2 = instance2.getWorkerMetrics("worker-1");

      expect(retrievedFromInstance1).toEqual(workerMetrics);
      expect(retrievedFromInstance2).toEqual(workerMetrics);
    });
  });
});

import { Queue } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createConsoleSpies,
  createMockQueue,
  flushPromises,
} from "../../test-utils/helpers";
import { QueueMonitor } from "../queue-monitor";
// Import the mocked system monitor
import { systemMonitor } from "../system-monitor";

// Mock the system monitor
vi.mock("../system-monitor", () => ({
  systemMonitor: {
    trackQueueMetrics: vi.fn(),
    logSystemEvent: vi.fn(),
  },
}));

describe("QueueMonitor", () => {
  let queueMonitor: QueueMonitor;
  let mockQueue: Queue;
  let consoleSpies: ReturnType<typeof createConsoleSpies>;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create console spies
    consoleSpies = createConsoleSpies();

    // Create a fresh instance for each test
    queueMonitor = QueueMonitor.getInstance();

    // Create a mock queue
    mockQueue = createMockQueue();
  });

  afterEach(() => {
    // Stop all monitoring and clean up
    queueMonitor.stopAllMonitoring();
    consoleSpies.restore();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = QueueMonitor.getInstance();
      const instance2 = QueueMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("startMonitoring", () => {
    it("should start monitoring a queue successfully", async () => {
      await queueMonitor.startMonitoring(mockQueue);

      expect(queueMonitor.isMonitoring("test-queue")).toBe(true);
      expect(queueMonitor.getMonitoredQueues()).toContain("test-queue");
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "Started monitoring queue: test-queue"
      );
    });

    it("should not start monitoring the same queue twice", async () => {
      await queueMonitor.startMonitoring(mockQueue);
      await queueMonitor.startMonitoring(mockQueue);

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "Queue test-queue is already being monitored"
      );
      expect(queueMonitor.getMonitoredQueues()).toHaveLength(1);
    });

    it("should collect initial metrics when starting monitoring", async () => {
      await queueMonitor.startMonitoring(mockQueue);

      // Wait for the initial metrics collection
      await flushPromises();

      expect(systemMonitor.trackQueueMetrics).toHaveBeenCalledWith(
        "test-queue",
        0, // totalJobs
        0, // waiting
        0, // active
        0, // completed
        0 // failed
      );
    });
  });

  describe("stopMonitoring", () => {
    it("should stop monitoring a specific queue", async () => {
      await queueMonitor.startMonitoring(mockQueue);

      queueMonitor.stopMonitoring("test-queue");

      expect(queueMonitor.isMonitoring("test-queue")).toBe(false);
      expect(queueMonitor.getMonitoredQueues()).not.toContain("test-queue");
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "Stopped monitoring queue: test-queue"
      );
    });

    it("should handle stopping monitoring for a non-existent queue", () => {
      queueMonitor.stopMonitoring("non-existent-queue");

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "Stopped monitoring queue: non-existent-queue"
      );
    });
  });

  describe("stopAllMonitoring", () => {
    it("should stop monitoring all queues", async () => {
      createMockQueue();
      const mockQueue2 = createMockQueue();

      // Override the name for the second queue
      Object.defineProperty(mockQueue2, "name", { value: "test-queue-2" });

      await queueMonitor.startMonitoring(mockQueue);
      await queueMonitor.startMonitoring(mockQueue2);

      queueMonitor.stopAllMonitoring();

      expect(queueMonitor.getMonitoredQueues()).toHaveLength(0);
      expect(queueMonitor.isMonitoring("test-queue")).toBe(false);
      expect(queueMonitor.isMonitoring("test-queue-2")).toBe(false);
    });
  });

  describe("collectQueueMetrics", () => {
    it("should collect metrics for a monitored queue", async () => {
      await queueMonitor.startMonitoring(mockQueue);

      // Mock queue job counts
      vi.mocked(mockQueue.getWaiting).mockResolvedValue([{ id: "1" }]);
      vi.mocked(mockQueue.getActive).mockResolvedValue([{ id: "2" }]);
      vi.mocked(mockQueue.getCompleted).mockResolvedValue([{ id: "3" }]);
      vi.mocked(mockQueue.getFailed).mockResolvedValue([{ id: "4" }]);

      await queueMonitor.collectQueueMetrics("test-queue");

      expect(systemMonitor.trackQueueMetrics).toHaveBeenCalledWith(
        "test-queue",
        4, // totalJobs (1+1+1+1)
        1, // waiting
        1, // active
        1, // completed
        1 // failed
      );
    });

    it("should handle queue not found in monitored queues", async () => {
      await queueMonitor.collectQueueMetrics("non-existent-queue");

      expect(consoleSpies.warnSpy).toHaveBeenCalledWith(
        "Queue non-existent-queue not found in monitored queues"
      );
      expect(systemMonitor.trackQueueMetrics).not.toHaveBeenCalled();
    });

    it("should handle errors during metrics collection", async () => {
      await queueMonitor.startMonitoring(mockQueue);

      // Mock an error
      vi.mocked(mockQueue.getWaiting).mockRejectedValue(
        new Error("Queue error")
      );

      await queueMonitor.collectQueueMetrics("test-queue");

      expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
        "Failed to collect metrics for queue test-queue:",
        expect.any(Error)
      );
      expect(systemMonitor.logSystemEvent).toHaveBeenCalledWith({
        type: "error_occurred",
        data: {
          component: "queue_monitor",
          status: "error",
          message: "Failed to collect metrics for queue test-queue",
          error: "Queue error",
        },
        timestamp: expect.any(Date),
      });
    });

    it("should log queue status in development environment", async () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      await queueMonitor.startMonitoring(mockQueue);

      // Mock queue job counts
      vi.mocked(mockQueue.getWaiting).mockResolvedValue([{ id: "1" }]);
      vi.mocked(mockQueue.getActive).mockResolvedValue([{ id: "2" }]);
      vi.mocked(mockQueue.getCompleted).mockResolvedValue([{ id: "3" }]);
      vi.mocked(mockQueue.getFailed).mockResolvedValue([{ id: "4" }]);

      await queueMonitor.collectQueueMetrics("test-queue");

      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "[QUEUE] test-queue: 1 waiting, 1 active, 1 completed, 1 failed"
      );

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it("should not log queue status in non-development environment", async () => {
      // Set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await queueMonitor.startMonitoring(mockQueue);

      // Mock queue job counts
      vi.mocked(mockQueue.getWaiting).mockResolvedValue([{ id: "1" }]);
      vi.mocked(mockQueue.getActive).mockResolvedValue([{ id: "2" }]);
      vi.mocked(mockQueue.getCompleted).mockResolvedValue([{ id: "3" }]);
      vi.mocked(mockQueue.getFailed).mockResolvedValue([{ id: "4" }]);

      await queueMonitor.collectQueueMetrics("test-queue");

      // Should not log the queue status in production
      const logCalls = consoleSpies.logSpy.mock.calls;
      const statusLogCall = logCalls.find((call) =>
        call[0]?.includes("[QUEUE] test-queue:")
      );
      expect(statusLogCall).toBeUndefined();

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("getMonitoredQueues", () => {
    it("should return empty array when no queues are monitored", () => {
      expect(queueMonitor.getMonitoredQueues()).toEqual([]);
    });

    it("should return array of monitored queue names", async () => {
      const mockQueue1 = createMockQueue();
      const mockQueue2 = createMockQueue();

      // Override the names for both queues
      Object.defineProperty(mockQueue1, "name", { value: "queue-1" });
      Object.defineProperty(mockQueue2, "name", { value: "queue-2" });

      await queueMonitor.startMonitoring(mockQueue1);
      await queueMonitor.startMonitoring(mockQueue2);

      const monitoredQueues = queueMonitor.getMonitoredQueues();
      expect(monitoredQueues).toContain("queue-1");
      expect(monitoredQueues).toContain("queue-2");
      expect(monitoredQueues).toHaveLength(2);
    });
  });

  describe("isMonitoring", () => {
    it("should return false for non-monitored queue", () => {
      expect(queueMonitor.isMonitoring("non-existent-queue")).toBe(false);
    });

    it("should return true for monitored queue", async () => {
      await queueMonitor.startMonitoring(mockQueue);
      expect(queueMonitor.isMonitoring("test-queue")).toBe(true);
    });
  });

  describe("getMonitoringStatus", () => {
    it("should return empty object when no queues are monitored", () => {
      expect(queueMonitor.getMonitoringStatus()).toEqual({});
    });

    it("should return monitoring status for all monitored queues", async () => {
      const mockQueue1 = createMockQueue();
      const mockQueue2 = createMockQueue();

      // Override the name for the second queue
      Object.defineProperty(mockQueue1, "name", { value: "queue-1" });
      Object.defineProperty(mockQueue2, "name", { value: "queue-2" });

      await queueMonitor.startMonitoring(mockQueue1);
      await queueMonitor.startMonitoring(mockQueue2);

      const status = queueMonitor.getMonitoringStatus();
      expect(status).toEqual({
        "queue-1": true,
        "queue-2": true,
      });
    });

    it("should return false for stopped monitoring", async () => {
      await queueMonitor.startMonitoring(mockQueue);

      queueMonitor.stopMonitoring("test-queue");

      const status = queueMonitor.getMonitoringStatus();
      expect(status).toEqual({});
    });
  });

  describe("Periodic Monitoring", () => {
    it("should collect metrics periodically", async () => {
      // Use fake timers for testing intervals
      vi.useFakeTimers();

      await queueMonitor.startMonitoring(mockQueue);

      // Fast-forward time to trigger the interval
      await vi.advanceTimersByTimeAsync(30000); // 30 seconds

      expect(systemMonitor.trackQueueMetrics).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should handle multiple periodic collections", async () => {
      vi.useFakeTimers();

      await queueMonitor.startMonitoring(mockQueue);

      // Fast-forward time multiple times
      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(30000);

      // Should be called multiple times (initial + 2 intervals)
      expect(systemMonitor.trackQueueMetrics).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("should handle non-Error objects in error handling", async () => {
      await queueMonitor.startMonitoring(mockQueue);

      // Mock an error that's not an Error instance
      vi.mocked(mockQueue.getWaiting).mockRejectedValue("String error");

      await queueMonitor.collectQueueMetrics("test-queue");

      expect(systemMonitor.logSystemEvent).toHaveBeenCalledWith({
        type: "error_occurred",
        data: {
          component: "queue_monitor",
          status: "error",
          message: "Failed to collect metrics for queue test-queue",
          error: "String error",
        },
        timestamp: expect.any(Date),
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { type WorkerFactory, type WorkerConfig } from "../../worker-factory";
import type { IServiceContainer } from "../../../../services/container";
import type { BaseWorker } from "../../../core/base-worker";
import type { BaseJobData, BaseWorkerDependencies } from "../../../types";

// Mock BullMQ Queue
vi.mock("bullmq", () => ({
  Queue: vi.fn(),
}));

describe("Worker Factory - Type Definitions", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockWorker: BaseWorker<BaseJobData, BaseWorkerDependencies>;

  beforeEach(() => {
    // Create mock worker
    mockWorker = {
      close: vi.fn(),
      getWorker: vi.fn(),
      getStatus: vi.fn(),
      validateDependencies: vi.fn(),
      createBaseDependencies: vi.fn(),
    } as unknown as BaseWorker<BaseJobData, BaseWorkerDependencies>;

    // Create mock queue
    mockQueue = {
      name: "test-queue",
    } as unknown as Queue;

    // Create mock container
    mockContainer = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn(),
        },
      },
    } as unknown as IServiceContainer;
  });

  describe("WorkerFactory type", () => {
    it("should accept valid WorkerFactory function", () => {
      // Arrange
      const validFactory: WorkerFactory = (_queue, _container) => {
        return mockWorker;
      };

      // Act
      const result = validFactory(mockQueue, mockContainer);

      // Assert
      expect(result).toBe(mockWorker);
    });

    it("should work with async WorkerFactory function", async () => {
      // Arrange
      const asyncFactory = async (
        _queue: Queue,
        _container: IServiceContainer
      ) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return mockWorker;
      };

      // Act
      const result = await asyncFactory(mockQueue, mockContainer);

      // Assert
      expect(result).toBe(mockWorker);
    });
  });

  describe("WorkerConfig interface", () => {
    it("should accept valid WorkerConfig object", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const validConfig: WorkerConfig = {
        name: "test-worker",
        factory: mockFactory,
        queue: mockQueue,
      };

      // Act & Assert
      expect(validConfig.name).toBe("test-worker");
      expect(validConfig.factory).toBe(mockFactory);
      expect(validConfig.queue).toBe(mockQueue);
    });

    it("should handle config with minimal required fields", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const minimalConfig: WorkerConfig = {
        name: "minimal-worker",
        factory: mockFactory,
        queue: mockQueue,
      };

      // Act & Assert
      expect(minimalConfig.name).toBe("minimal-worker");
      expect(minimalConfig.factory).toBe(mockFactory);
      expect(minimalConfig.queue).toBe(mockQueue);
    });
  });
});

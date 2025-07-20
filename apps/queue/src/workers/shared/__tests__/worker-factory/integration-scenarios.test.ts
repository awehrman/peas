import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import {
  createWorkers,
  type WorkerFactory,
  type WorkerConfig,
} from "../../worker-factory";
import type { IServiceContainer } from "../../../../services/container";
import type { BaseWorker } from "../../../core/base-worker";
import type { BaseJobData, BaseWorkerDependencies } from "../../../types";

// Mock BullMQ Queue
vi.mock("bullmq", () => ({
  Queue: vi.fn(),
}));

describe("Worker Factory - Integration Scenarios", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockWorker: BaseWorker<BaseJobData, BaseWorkerDependencies>;
  let mockLogger: { log: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Create mock container
    mockContainer = {
      logger: mockLogger,
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn(),
        },
      },
    } as unknown as IServiceContainer;

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
  });

  describe("integration scenarios", () => {
    it("should handle mixed success and failure scenarios", () => {
      // Arrange
      const mockFactory1: WorkerFactory = vi.fn().mockReturnValue(mockWorker);
      const error = new Error("Second worker failed");
      const mockFactory2: WorkerFactory = vi.fn().mockImplementation(() => {
        throw error;
      });
      const mockFactory3: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const configs: WorkerConfig[] = [
        {
          name: "success-1",
          factory: mockFactory1,
          queue: mockQueue,
        },
        {
          name: "failure",
          factory: mockFactory2,
          queue: mockQueue,
        },
        {
          name: "success-2",
          factory: mockFactory3,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow(
        "Second worker failed"
      );

      expect(mockFactory1).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(mockFactory2).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(mockFactory3).not.toHaveBeenCalled(); // Should not reach this

      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ success-1 worker created and started"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create failure worker: Second worker failed",
        "error"
      );
    });

    it("should handle large number of workers", () => {
      // Arrange
      const configs: WorkerConfig[] = [];
      const mockFactories: WorkerFactory[] = [];

      for (let i = 0; i < 100; i++) {
        const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);
        mockFactories.push(mockFactory);

        configs.push({
          name: `worker-${i}`,
          factory: mockFactory,
          queue: mockQueue,
        });
      }

      // Act
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(Object.keys(result)).toHaveLength(100);

      for (let i = 0; i < 100; i++) {
        expect(result[`worker-${i}`]).toBe(mockWorker);
        expect(mockFactories[i]).toHaveBeenCalledWith(mockQueue, mockContainer);
        expect(mockLogger.log).toHaveBeenCalledWith(
          `✅ worker-${i} worker created and started`
        );
      }
    });
  });

  describe("error handling edge cases", () => {
    it("should handle error with circular reference", () => {
      // Arrange
      const circularError = new Error("Circular error") as Error & {
        self: Error;
      };
      circularError.self = circularError;

      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw circularError;
      });

      const configs: WorkerConfig[] = [
        {
          name: "circular-error-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow(
        "Circular error"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create circular-error-worker worker: Circular error",
        "error"
      );
    });

    it("should handle error with custom toString", () => {
      // Arrange
      const customError = {
        toString: () => "Custom error message",
        message: "Original message",
      };

      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw customError;
      });

      const configs: WorkerConfig[] = [
        {
          name: "custom-error-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create custom-error-worker worker: Unknown error",
        "error"
      );
    });
  });
});

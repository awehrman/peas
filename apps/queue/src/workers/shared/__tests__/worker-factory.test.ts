import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import {
  createWorkers,
  type WorkerFactory,
  type WorkerConfig,
} from "../worker-factory";
import type { IServiceContainer } from "../../../services/container";
import type { BaseWorker } from "../../core/base-worker";
import type { BaseJobData, BaseWorkerDependencies } from "../../types";

// Mock BullMQ Queue
vi.mock("bullmq", () => ({
  Queue: vi.fn(),
}));

describe("Worker Factory", () => {
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

  describe("createWorkers", () => {
    it("should create and start multiple workers successfully", () => {
      // Arrange
      const mockFactory1: WorkerFactory = vi.fn().mockReturnValue(mockWorker);
      const mockFactory2: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const configs: WorkerConfig[] = [
        {
          name: "worker-1",
          factory: mockFactory1,
          queue: mockQueue,
        },
        {
          name: "worker-2",
          factory: mockFactory2,
          queue: mockQueue,
        },
      ];

      // Act
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({
        "worker-1": mockWorker,
        "worker-2": mockWorker,
      });

      expect(mockFactory1).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(mockFactory2).toHaveBeenCalledWith(mockQueue, mockContainer);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ worker-1 worker created and started"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ worker-2 worker created and started"
      );
    });

    it("should create a single worker successfully", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const configs: WorkerConfig[] = [
        {
          name: "single-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({
        "single-worker": mockWorker,
      });

      expect(mockFactory).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ single-worker worker created and started"
      );
    });

    it("should handle empty configs array", () => {
      // Arrange
      const configs: WorkerConfig[] = [];

      // Act
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({});
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it("should throw error when worker factory fails", () => {
      // Arrange
      const error = new Error("Factory failed");
      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw error;
      });

      const configs: WorkerConfig[] = [
        {
          name: "failing-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow(
        "Factory failed"
      );

      expect(mockFactory).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create failing-worker worker: Factory failed",
        "error"
      );
    });

    it("should throw error when second worker factory fails", () => {
      // Arrange
      const mockFactory1: WorkerFactory = vi.fn().mockReturnValue(mockWorker);
      const error = new Error("Second factory failed");
      const mockFactory2: WorkerFactory = vi.fn().mockImplementation(() => {
        throw error;
      });

      const configs: WorkerConfig[] = [
        {
          name: "worker-1",
          factory: mockFactory1,
          queue: mockQueue,
        },
        {
          name: "worker-2",
          factory: mockFactory2,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow(
        "Second factory failed"
      );

      expect(mockFactory1).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(mockFactory2).toHaveBeenCalledWith(mockQueue, mockContainer);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ worker-1 worker created and started"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create worker-2 worker: Second factory failed",
        "error"
      );
    });

    it("should handle different types of errors", () => {
      // Arrange
      const stringError = "String error";
      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw stringError;
      });

      const configs: WorkerConfig[] = [
        {
          name: "string-error-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow(
        "String error"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create string-error-worker worker: Unknown error",
        "error"
      );
    });

    it("should handle null error", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw null;
      });

      const configs: WorkerConfig[] = [
        {
          name: "null-error-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create null-error-worker worker: Unknown error",
        "error"
      );
    });

    it("should handle undefined error", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw undefined;
      });

      const configs: WorkerConfig[] = [
        {
          name: "undefined-error-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act & Assert
      expect(() => createWorkers(configs, mockContainer)).toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        "❌ Failed to create undefined-error-worker worker: Unknown error",
        "error"
      );
    });

    it("should handle worker names with special characters", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const configs: WorkerConfig[] = [
        {
          name: "worker-with-special-chars-123!@#",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({
        "worker-with-special-chars-123!@#": mockWorker,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ worker-with-special-chars-123!@# worker created and started"
      );
    });

    it("should handle empty worker name", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const configs: WorkerConfig[] = [
        {
          name: "",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      // Act
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({
        "": mockWorker,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ {workerName} worker created and started"
      );
    });

    it("should handle multiple workers with same name (last one wins)", () => {
      // Arrange
      const mockWorker1 = { ...mockWorker };
      const mockWorker2 = { ...mockWorker };
      const mockFactory1: WorkerFactory = vi.fn().mockReturnValue(mockWorker1);
      const mockFactory2: WorkerFactory = vi.fn().mockReturnValue(mockWorker2);

      const configs: WorkerConfig[] = [
        {
          name: "duplicate-worker",
          factory: mockFactory1,
          queue: mockQueue,
        },
        {
          name: "duplicate-worker",
          factory: mockFactory2,
          queue: mockQueue,
        },
      ];

      // Act
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({
        "duplicate-worker": mockWorker2, // Last one wins
      });

      expect(mockFactory1).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(mockFactory2).toHaveBeenCalledWith(mockQueue, mockContainer);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ duplicate-worker worker created and started"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "✅ duplicate-worker worker created and started"
      );
    });
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

      // Act
      const configs: WorkerConfig[] = [validConfig];
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({
        "test-worker": mockWorker,
      });
    });

    it("should handle config with minimal required fields", () => {
      // Arrange
      const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);

      const minimalConfig: WorkerConfig = {
        name: "minimal-worker",
        factory: mockFactory,
        queue: mockQueue,
      };

      // Act
      const configs: WorkerConfig[] = [minimalConfig];
      const result = createWorkers(configs, mockContainer);

      // Assert
      expect(result).toEqual({
        "minimal-worker": mockWorker,
      });
    });
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

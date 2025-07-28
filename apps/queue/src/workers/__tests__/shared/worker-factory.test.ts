import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LOG_MESSAGES } from "../../../config/constants";
import type { IServiceContainer } from "../../../services/container";
import { formatLogMessage } from "../../../utils/utils";
import {
  type WorkerConfig,
  type WorkerFactory,
  closeWorkers,
  createWorkerConfig,
  createWorkers,
  getWorkerStatus,
  validateWorkerConfig,
} from "../../shared/worker-factory";

describe("Worker Factory", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockWorker: { close: () => Promise<void>; getStatus: () => unknown };
  let mockNoteWorker: { close: () => Promise<void>; getStatus: () => unknown };

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueue = {
      name: "test-queue",
    } as unknown as Queue;

    mockContainer = {
      logger: {
        log: vi.fn(),
      },
    } as unknown as IServiceContainer;

    mockWorker = {
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ status: "running" }),
    };

    mockNoteWorker = {
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ status: "processing" }),
    };
  });

  describe("createWorkers", () => {
    it("should create workers successfully", () => {
      const mockFactory: WorkerFactory = vi.fn().mockReturnValue(mockWorker);
      const configs: WorkerConfig[] = [
        {
          name: "test-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      const result = createWorkers(configs, mockContainer);

      expect(mockFactory).toHaveBeenCalledWith(mockQueue, mockContainer);
      expect(result).toEqual({
        "test-worker": mockWorker,
      });
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.SUCCESS.WORKER_STARTED, {
          workerName: "test-worker",
        })
      );
    });

    it("should create multiple workers", () => {
      const mockFactory1: WorkerFactory = vi.fn().mockReturnValue(mockWorker);
      const mockFactory2: WorkerFactory = vi
        .fn()
        .mockReturnValue(mockNoteWorker);
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

      const result = createWorkers(configs, mockContainer);

      expect(result).toEqual({
        "worker-1": mockWorker,
        "worker-2": mockNoteWorker,
      });
      expect(mockContainer.logger.log).toHaveBeenCalledTimes(2);
    });

    it("should handle factory errors", () => {
      const factoryError = new Error("Factory failed");
      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw factoryError;
      });
      const configs: WorkerConfig[] = [
        {
          name: "failing-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      expect(() => createWorkers(configs, mockContainer)).toThrow(
        "Factory failed"
      );

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.ERROR.WORKER_FAILED, {
          workerName: "failing-worker",
          error: "Factory failed",
        }),
        "error"
      );
    });

    it("should handle non-Error exceptions", () => {
      const mockFactory: WorkerFactory = vi.fn().mockImplementation(() => {
        throw "String error";
      });
      const configs: WorkerConfig[] = [
        {
          name: "string-error-worker",
          factory: mockFactory,
          queue: mockQueue,
        },
      ];

      expect(() => createWorkers(configs, mockContainer)).toThrow(
        "String error"
      );

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.ERROR.WORKER_FAILED, {
          workerName: "string-error-worker",
          error: "Unknown error",
        }),
        "error"
      );
    });

    it("should handle null/undefined exceptions", () => {
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

      expect(() => createWorkers(configs, mockContainer)).toThrow();

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.ERROR.WORKER_FAILED, {
          workerName: "null-error-worker",
          error: "Unknown error",
        }),
        "error"
      );
    });
  });

  describe("closeWorkers", () => {
    it("should close workers successfully", async () => {
      const workers = {
        "worker-1": mockWorker,
        "worker-2": mockNoteWorker,
      };

      await closeWorkers(workers, mockContainer);

      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockNoteWorker.close).toHaveBeenCalled();
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.SUCCESS.WORKER_CLOSED, {
          workerName: "worker-1",
        })
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.SUCCESS.WORKER_CLOSED, {
          workerName: "worker-2",
        })
      );
    });

    it("should handle worker close errors gracefully", async () => {
      const closeError = new Error("Close failed");
      mockWorker.close = vi.fn().mockRejectedValue(closeError);
      const workers = {
        "failing-worker": mockWorker,
        "successful-worker": mockNoteWorker,
      };

      await closeWorkers(workers, mockContainer);

      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockNoteWorker.close).toHaveBeenCalled();
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.ERROR.WORKER_ERROR, {
          workerName: "failing-worker",
          error: "Close failed",
        }),
        "error"
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.SUCCESS.WORKER_CLOSED, {
          workerName: "successful-worker",
        })
      );
    });

    it("should handle non-Error close exceptions", async () => {
      mockWorker.close = vi.fn().mockRejectedValue("String close error");
      const workers = {
        "string-error-worker": mockWorker,
      };

      await closeWorkers(workers, mockContainer);

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        formatLogMessage(LOG_MESSAGES.ERROR.WORKER_ERROR, {
          workerName: "string-error-worker",
          error: "Unknown error",
        }),
        "error"
      );
    });

    it("should handle empty workers object", async () => {
      const workers = {};

      await closeWorkers(workers, mockContainer);

      expect(mockContainer.logger.log).not.toHaveBeenCalled();
    });

    it("should use Promise.allSettled for concurrent closing", async () => {
      const slowWorker = {
        close: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
          ),
        getStatus: vi.fn().mockReturnValue({ status: "slow" }),
      };
      const fastWorker = {
        close: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({ status: "fast" }),
      };
      const workers = {
        "slow-worker": slowWorker,
        "fast-worker": fastWorker,
      };

      const startTime = Date.now();
      await closeWorkers(workers, mockContainer);
      const endTime = Date.now();

      // Both workers should be closed, but we don't wait for the slow one to block the fast one
      expect(slowWorker.close).toHaveBeenCalled();
      expect(fastWorker.close).toHaveBeenCalled();
      // The total time should be less than the sum of individual times due to concurrency
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe("getWorkerStatus", () => {
    it("should get status for all workers", () => {
      const workers = {
        "worker-1": mockWorker,
        "worker-2": mockNoteWorker,
      };

      const result = getWorkerStatus(workers);

      expect(result).toEqual([
        {
          name: "worker-1",
          status: { status: "running" },
        },
        {
          name: "worker-2",
          status: { status: "processing" },
        },
      ]);
      expect(mockWorker.getStatus).toHaveBeenCalled();
      expect(mockNoteWorker.getStatus).toHaveBeenCalled();
    });

    it("should handle empty workers object", () => {
      const workers = {};

      const result = getWorkerStatus(workers);

      expect(result).toEqual([]);
    });

    it("should handle workers with different status types", () => {
      const workerWithStringStatus = {
        getStatus: vi.fn().mockReturnValue("idle"),
      };
      const workerWithObjectStatus = {
        getStatus: vi.fn().mockReturnValue({ state: "busy", queueSize: 5 }),
      };
      const workers = {
        "string-status": workerWithStringStatus,
        "object-status": workerWithObjectStatus,
      };

      const result = getWorkerStatus(workers);

      expect(result).toEqual([
        {
          name: "string-status",
          status: "idle",
        },
        {
          name: "object-status",
          status: { state: "busy", queueSize: 5 },
        },
      ]);
    });
  });

  describe("validateWorkerConfig", () => {
    it("should validate correct config", () => {
      const validConfig: WorkerConfig = {
        name: "valid-worker",
        factory: vi.fn(),
        queue: mockQueue,
      };

      expect(() => validateWorkerConfig(validConfig)).not.toThrow();
    });

    it("should throw error for missing name", () => {
      const invalidConfig = {
        factory: vi.fn(),
        queue: mockQueue,
      } as unknown as WorkerConfig;

      expect(() => validateWorkerConfig(invalidConfig)).toThrow(
        "Worker config must have a valid name"
      );
    });

    it("should throw error for empty name", () => {
      const invalidConfig: WorkerConfig = {
        name: "",
        factory: vi.fn(),
        queue: mockQueue,
      };

      expect(() => validateWorkerConfig(invalidConfig)).toThrow(
        "Worker config must have a valid name"
      );
    });

    it("should throw error for non-string name", () => {
      const invalidConfig = {
        name: 123,
        factory: vi.fn(),
        queue: mockQueue,
      } as unknown as WorkerConfig;

      expect(() => validateWorkerConfig(invalidConfig)).toThrow(
        "Worker config must have a valid name"
      );
    });

    it("should throw error for missing factory", () => {
      const invalidConfig = {
        name: "no-factory-worker",
        queue: mockQueue,
      } as unknown as WorkerConfig;

      expect(() => validateWorkerConfig(invalidConfig)).toThrow(
        "Worker config must have a valid factory function"
      );
    });

    it("should throw error for non-function factory", () => {
      const invalidConfig = {
        name: "invalid-factory-worker",
        factory: "not-a-function",
        queue: mockQueue,
      } as unknown as WorkerConfig;

      expect(() => validateWorkerConfig(invalidConfig)).toThrow(
        "Worker config must have a valid factory function"
      );
    });

    it("should throw error for missing queue", () => {
      const invalidConfig = {
        name: "no-queue-worker",
        factory: vi.fn(),
      } as unknown as WorkerConfig;

      expect(() => validateWorkerConfig(invalidConfig)).toThrow(
        "Worker config must have a valid queue"
      );
    });

    it("should throw error for null queue", () => {
      const invalidConfig: WorkerConfig = {
        name: "null-queue-worker",
        factory: vi.fn(),
        queue: null as unknown as Queue,
      };

      expect(() => validateWorkerConfig(invalidConfig)).toThrow(
        "Worker config must have a valid queue"
      );
    });
  });

  describe("createWorkerConfig", () => {
    it("should create valid config", () => {
      const mockFactory: WorkerFactory = vi.fn();
      const name = "test-worker";

      const result = createWorkerConfig(name, mockFactory, mockQueue);

      expect(result).toEqual({
        name,
        factory: mockFactory,
        queue: mockQueue,
      });
    });

    it("should validate config during creation", () => {
      const mockFactory: WorkerFactory = vi.fn();
      const name = "test-worker";

      const result = createWorkerConfig(name, mockFactory, mockQueue);

      // Should not throw and return valid config
      expect(result.name).toBe(name);
      expect(result.factory).toBe(mockFactory);
      expect(result.queue).toBe(mockQueue);
    });

    it("should throw error for invalid config", () => {
      const mockFactory: WorkerFactory = vi.fn();

      expect(() => createWorkerConfig("", mockFactory, mockQueue)).toThrow(
        "Worker config must have a valid name"
      );
    });

    it("should throw error for invalid factory", () => {
      expect(() =>
        createWorkerConfig("test", null as unknown as WorkerFactory, mockQueue)
      ).toThrow("Worker config must have a valid factory function");
    });

    it("should throw error for invalid queue", () => {
      const mockFactory: WorkerFactory = vi.fn();

      expect(() =>
        createWorkerConfig("test", mockFactory, null as unknown as Queue)
      ).toThrow("Worker config must have a valid queue");
    });
  });

  describe("type definitions", () => {
    it("should have correct WorkerFactory type", () => {
      const factory: WorkerFactory = (_queue, _container) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return mockWorker as any;
      };

      expect(typeof factory).toBe("function");
      expect(factory.length).toBe(2); // Two parameters: queue and container
    });

    it("should have correct WorkerConfig type", () => {
      const config: WorkerConfig = {
        name: "test",
        factory: vi.fn(),
        queue: mockQueue,
      };

      expect(config.name).toBe("test");
      expect(typeof config.factory).toBe("function");
      expect(config.queue).toBe(mockQueue);
    });

    it("should handle generic worker types", () => {
      const specificWorker = {
        close: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({ custom: "status" }),
      };

      const specificFactory: WorkerFactory<typeof specificWorker> = () =>
        specificWorker;
      const specificConfig: WorkerConfig<typeof specificWorker> = {
        name: "specific-worker",
        factory: specificFactory,
        queue: mockQueue,
      };

      expect(specificConfig.factory).toBe(specificFactory);
    });
  });
});

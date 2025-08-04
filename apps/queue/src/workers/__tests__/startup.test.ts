import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../services/container";
import {
  createMockDatabaseService,
  createMockQueueService,
  createMockServiceInstances,
} from "../../test-utils/service";

// Mock all dependencies
vi.mock("../note", () => ({
  createNoteWorker: vi.fn(),
}));

vi.mock("../instruction", () => ({
  createInstructionWorker: vi.fn(),
}));

vi.mock("../ingredient", () => ({
  createIngredientWorker: vi.fn(),
}));

vi.mock("../../monitoring/queue-monitor", () => ({
  queueMonitor: {
    startMonitoring: vi.fn(),
  },
}));

vi.mock("../../config/constants", () => ({
  LOG_MESSAGES: {
    INFO: {
      WORKERS_STARTED: "👷 All workers started successfully",
    },
  },
  WORKER_CONSTANTS: {
    NAMES: {
      NOTE: "note_processing",
      INSTRUCTION: "instruction_processing",
      INGREDIENT: "ingredient_processing",
    },
  },
}));

vi.mock("../shared/worker-factory", () => ({
  createWorkerConfig: vi.fn(),
  createWorkers: vi.fn(),
}));

describe("Worker Startup", () => {
  let mockQueue: Queue;
  let mockServiceContainer: IServiceContainer;
  let mockCreateNoteWorker: ReturnType<typeof vi.fn>;
  let mockCreateInstructionWorker: ReturnType<typeof vi.fn>;
  let mockCreateIngredientWorker: ReturnType<typeof vi.fn>;
  let mockQueueMonitor: { startMonitoring: ReturnType<typeof vi.fn> };
  let mockCreateWorkerConfig: ReturnType<typeof vi.fn>;
  let mockCreateWorkers: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock queue
    mockQueue = {
      name: "test-queue",
    } as unknown as Queue;

    // Create mock service container using test utilities
    const mockInstances = createMockServiceInstances();
    mockServiceContainer = {
      ...mockInstances,
      queues: createMockQueueService(),
      database: createMockDatabaseService(),
      _workers: {},
      close: vi.fn(),
    };

    // Get mocked functions
    const noteModule = vi.mocked(await import("../note"));
    const instructionModule = vi.mocked(await import("../instruction"));
    const ingredientModule = vi.mocked(await import("../ingredient"));
    const queueMonitorModule = vi.mocked(
      await import("../../monitoring/queue-monitor")
    );
    const workerFactoryModule = vi.mocked(
      await import("../shared/worker-factory")
    );

    mockCreateNoteWorker = noteModule.createNoteWorker;
    mockCreateInstructionWorker = instructionModule.createInstructionWorker;
    mockCreateIngredientWorker = ingredientModule.createIngredientWorker;
    mockQueueMonitor = queueMonitorModule.queueMonitor as unknown as {
      startMonitoring: ReturnType<typeof vi.fn>;
    };
    mockCreateWorkerConfig = workerFactoryModule.createWorkerConfig;
    mockCreateWorkers = workerFactoryModule.createWorkers;

    // Reset all mocks to default behavior
    mockCreateNoteWorker.mockReturnValue({});
    mockCreateInstructionWorker.mockReturnValue({});
    mockCreateIngredientWorker.mockReturnValue({});
    mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
    mockCreateWorkers.mockReturnValue({});
    mockQueueMonitor.startMonitoring.mockImplementation(() => {});
    (
      mockServiceContainer.logger.log as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {});
  });

  describe("startWorkers", () => {
    it("should start workers successfully", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INGREDIENT]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      mockCreateIngredientWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      const result = startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      expect(mockCreateWorkerConfig).toHaveBeenCalledWith(
        vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS.NAMES
          .NOTE,
        mockCreateNoteWorker,
        mockQueue
      );
      expect(mockCreateWorkers).toHaveBeenCalledWith(
        [
          { name: "test-config" },
          { name: "test-config" },
          { name: "test-config" },
          { name: "test-config" },
        ],
        mockServiceContainer
      );
      expect(mockQueueMonitor.startMonitoring).toHaveBeenCalledWith(mockQueue);
      expect(mockServiceContainer._workers).toEqual({
        noteWorker: mockWorker,
        instructionWorker: mockWorker,
        ingredientWorker: mockWorker,
      });
      expect(mockServiceContainer.logger.log).toHaveBeenCalledWith(
        vi.mocked(await import("../../config/constants")).LOG_MESSAGES.INFO
          .WORKERS_STARTED
      );
      expect(result).toEqual(mockWorkers);
    });

    it("should handle multiple worker configurations", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INGREDIENT]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      mockCreateIngredientWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      const result = startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      expect(mockCreateWorkerConfig).toHaveBeenCalledTimes(4);
      expect(mockCreateWorkers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkers);
    });

    it("should store workers in service container for graceful shutdown", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INGREDIENT]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      mockCreateIngredientWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      expect(mockServiceContainer._workers).toEqual({
        noteWorker: mockWorker,
        instructionWorker: mockWorker,
        ingredientWorker: mockWorker,
      });
    });

    it("should start queue monitoring", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      expect(mockQueueMonitor.startMonitoring).toHaveBeenCalledWith(mockQueue);
    });

    it("should log successful worker startup", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      expect(mockServiceContainer.logger.log).toHaveBeenCalledWith(
        vi.mocked(await import("../../config/constants")).LOG_MESSAGES.INFO
          .WORKERS_STARTED
      );
    });

    it("should handle worker creation errors", async () => {
      const error = new Error("Worker creation failed");
      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      const { startWorkers } = await import("../startup");
      expect(() => {
        startWorkers(
          {
            noteQueue: mockQueue,
            instructionQueue: mockQueue,
            ingredientQueue: mockQueue,
            imageQueue: mockQueue,
          },
          mockServiceContainer
        );
      }).toThrow("Worker creation failed");
    });

    it("should handle queue monitoring errors gracefully", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      mockQueueMonitor.startMonitoring.mockImplementation(() => {
        throw new Error("Monitoring failed");
      });

      // Act & Assert
      const { startWorkers } = await import("../startup");
      expect(() => {
        startWorkers(
          {
            noteQueue: mockQueue,
            instructionQueue: mockQueue,
            ingredientQueue: mockQueue,
            imageQueue: mockQueue,
          },
          mockServiceContainer
        );
      }).toThrow("Monitoring failed");
    });

    it("should handle service container logger errors", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      (
        mockServiceContainer.logger.log as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw new Error("Logger failed");
      });

      // Act & Assert
      const { startWorkers } = await import("../startup");
      expect(() => {
        startWorkers(
          {
            noteQueue: mockQueue,
            instructionQueue: mockQueue,
            ingredientQueue: mockQueue,
            imageQueue: mockQueue,
          },
          mockServiceContainer
        );
      }).toThrow("Logger failed");
    });

    it("should use correct worker constants", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      const constants = await import("../../config/constants");
      expect(mockCreateWorkerConfig).toHaveBeenCalledWith(
        constants.WORKER_CONSTANTS.NAMES.NOTE,
        mockCreateNoteWorker,
        mockQueue
      );
    });

    it("should use correct log messages", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      const constants = await import("../../config/constants");
      expect(mockServiceContainer.logger.log).toHaveBeenCalledWith(
        constants.LOG_MESSAGES.INFO.WORKERS_STARTED
      );
    });

    it("should handle empty worker configuration array", async () => {
      const mockWorkers = {};
      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue({});
      mockCreateInstructionWorker.mockReturnValue({});

      const { startWorkers } = await import("../startup");
      const result = startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        mockServiceContainer
      );

      expect(result).toEqual(mockWorkers);
      expect(mockServiceContainer._workers).toEqual({
        noteWorker: undefined,
        instructionWorker: undefined,
      });
    });

    it("should handle null or undefined service container", async () => {
      const mockWorker = { name: "test-worker" };
      const mockWorkers = {
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.NOTE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.INSTRUCTION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);

      const nullServiceContainer = {
        logger: {
          log: vi.fn(),
        },
        _workers: null,
        queues: {},
        database: {},
        errorHandler: {},
        healthMonitor: {},
        webSocket: {},
        statusBroadcaster: {},
        config: {},
        close: vi.fn(),
      } as unknown as IServiceContainer;

      const { startWorkers } = await import("../startup");
      const result = startWorkers(
        {
          noteQueue: mockQueue,
          instructionQueue: mockQueue,
          ingredientQueue: mockQueue,
          imageQueue: mockQueue,
        },
        nullServiceContainer
      );

      expect(result).toEqual(mockWorkers);
      expect(nullServiceContainer._workers).toEqual({
        noteWorker: mockWorker,
        instructionWorker: mockWorker,
      });
    });
  });
});

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

vi.mock("../pattern-tracking", () => ({
  createPatternTrackingWorker: vi.fn(),
}));

vi.mock("../categorization", () => ({
  createCategorizationWorker: vi.fn(),
}));

vi.mock("../image/factory", () => ({
  createImageWorker: vi.fn(),
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
      IMAGE: "image_processing",
      PATTERN_TRACKING: "pattern_tracking",
      CATEGORIZATION: "categorization_processing",
    },
  },
}));

vi.mock("../shared/worker-factory", () => ({
  createWorkerConfig: vi.fn(),
  createWorkers: vi.fn(),
}));

describe("Worker Startup", () => {
  let mockServiceContainer: IServiceContainer;
  let mockQueues: ReturnType<typeof createMockQueueService>;
  let mockCreateNoteWorker: ReturnType<typeof vi.fn>;
  let mockCreateInstructionWorker: ReturnType<typeof vi.fn>;
  let mockCreateIngredientWorker: ReturnType<typeof vi.fn>;
  let mockCreatePatternTrackingWorker: ReturnType<typeof vi.fn>;
  let mockCreateCategorizationWorker: ReturnType<typeof vi.fn>;
  let mockCreateImageWorker: ReturnType<typeof vi.fn>;
  let mockQueueMonitor: { startMonitoring: ReturnType<typeof vi.fn> };
  let mockCreateWorkerConfig: ReturnType<typeof vi.fn>;
  let mockCreateWorkers: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock service container using test utilities
    const mockInstances = createMockServiceInstances();
    mockQueues = createMockQueueService();
    mockServiceContainer = {
      ...mockInstances,
      queues: mockQueues,
      database: createMockDatabaseService(),
      _workers: {},
      close: vi.fn(),
    };

    // Get mocked functions
    const noteModule = vi.mocked(await import("../note"));
    const instructionModule = vi.mocked(await import("../instruction"));
    const ingredientModule = vi.mocked(await import("../ingredient"));
    const patternTrackingModule = vi.mocked(
      await import("../pattern-tracking")
    );
    const imageModule = vi.mocked(await import("../image/factory"));
    const queueMonitorModule = vi.mocked(
      await import("../../monitoring/queue-monitor")
    );
    const workerFactoryModule = vi.mocked(
      await import("../shared/worker-factory")
    );

    mockCreateNoteWorker = noteModule.createNoteWorker;
    mockCreateInstructionWorker = instructionModule.createInstructionWorker;
    mockCreateIngredientWorker = ingredientModule.createIngredientWorker;
    mockCreatePatternTrackingWorker =
      patternTrackingModule.createPatternTrackingWorker;
    mockCreateCategorizationWorker = vi.mocked(
      await import("../categorization")
    ).createCategorizationWorker;
    mockCreateImageWorker = imageModule.createImageWorker;
    mockQueueMonitor = queueMonitorModule.queueMonitor as unknown as {
      startMonitoring: ReturnType<typeof vi.fn>;
    };
    mockCreateWorkerConfig = workerFactoryModule.createWorkerConfig;
    mockCreateWorkers = workerFactoryModule.createWorkers;

    // Reset all mocks to default behavior
    mockCreateNoteWorker.mockReturnValue({});
    mockCreateInstructionWorker.mockReturnValue({});
    mockCreateIngredientWorker.mockReturnValue({});
    mockCreatePatternTrackingWorker.mockReturnValue({});
    mockCreateCategorizationWorker.mockReturnValue({});
    mockCreateImageWorker.mockReturnValue({});
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
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.IMAGE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.PATTERN_TRACKING]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.CATEGORIZATION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      mockCreateIngredientWorker.mockReturnValue(mockWorker);
      mockCreateImageWorker.mockReturnValue(mockWorker);
      mockCreatePatternTrackingWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      const result = startWorkers(mockQueues, mockServiceContainer);

      expect(mockCreateWorkerConfig).toHaveBeenCalledWith(
        vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS.NAMES
          .NOTE,
        mockCreateNoteWorker,
        mockQueues.noteQueue
      );
      expect(mockCreateWorkers).toHaveBeenCalledWith(
        [
          { name: "test-config" },
          { name: "test-config" },
          { name: "test-config" },
          { name: "test-config" },
          { name: "test-config" },
          { name: "test-config" },
        ],
        mockServiceContainer
      );
      expect(mockQueueMonitor.startMonitoring).toHaveBeenCalledWith(
        mockQueues.noteQueue
      );
      expect(mockServiceContainer._workers).toEqual({
        noteWorker: mockWorker,
        instructionWorker: mockWorker,
        ingredientWorker: mockWorker,
        imageWorker: mockWorker,
        patternTrackingWorker: mockWorker,
        categorizationWorker: mockWorker,
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
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.IMAGE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.PATTERN_TRACKING]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.CATEGORIZATION]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      mockCreateIngredientWorker.mockReturnValue(mockWorker);
      mockCreateImageWorker.mockReturnValue(mockWorker);
      mockCreatePatternTrackingWorker.mockReturnValue(mockWorker);
      mockCreateCategorizationWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      const result = startWorkers(mockQueues, mockServiceContainer);

      expect(mockCreateWorkerConfig).toHaveBeenCalledTimes(6);
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
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.IMAGE]: mockWorker,
        [vi.mocked(await import("../../config/constants")).WORKER_CONSTANTS
          .NAMES.PATTERN_TRACKING]: mockWorker,
      };

      mockCreateWorkerConfig.mockReturnValue({ name: "test-config" });
      mockCreateWorkers.mockReturnValue(mockWorkers);
      mockCreateNoteWorker.mockReturnValue(mockWorker);
      mockCreateInstructionWorker.mockReturnValue(mockWorker);
      mockCreateIngredientWorker.mockReturnValue(mockWorker);
      mockCreateImageWorker.mockReturnValue(mockWorker);
      mockCreatePatternTrackingWorker.mockReturnValue(mockWorker);

      const { startWorkers } = await import("../startup");
      startWorkers(mockQueues, mockServiceContainer);

      expect(mockServiceContainer._workers).toEqual({
        noteWorker: mockWorker,
        instructionWorker: mockWorker,
        ingredientWorker: mockWorker,
        imageWorker: mockWorker,
        patternTrackingWorker: mockWorker,
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
      startWorkers(mockQueues, mockServiceContainer);

      expect(mockQueueMonitor.startMonitoring).toHaveBeenCalledWith(
        mockQueues.noteQueue
      );
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
      startWorkers(mockQueues, mockServiceContainer);

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
        startWorkers(mockQueues, mockServiceContainer);
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
        startWorkers(mockQueues, mockServiceContainer);
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
        startWorkers(mockQueues, mockServiceContainer);
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
      startWorkers(mockQueues, mockServiceContainer);

      const constants = await import("../../config/constants");
      expect(mockCreateWorkerConfig).toHaveBeenCalledWith(
        constants.WORKER_CONSTANTS.NAMES.NOTE,
        mockCreateNoteWorker,
        mockQueues.noteQueue
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
      startWorkers(mockQueues, mockServiceContainer);

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
      const result = startWorkers(mockQueues, mockServiceContainer);

      expect(result).toEqual(mockWorkers);
      expect(mockServiceContainer._workers).toEqual({
        noteWorker: undefined,
        instructionWorker: undefined,
        ingredientWorker: undefined,
        imageWorker: undefined,
        patternTrackingWorker: undefined,
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
      const result = startWorkers(mockQueues, nullServiceContainer);

      expect(result).toEqual(mockWorkers);
      expect(nullServiceContainer._workers).toEqual({
        noteWorker: mockWorker,
        instructionWorker: mockWorker,
        ingredientWorker: undefined,
        imageWorker: undefined,
        patternTrackingWorker: undefined,
      });
    });
  });
});

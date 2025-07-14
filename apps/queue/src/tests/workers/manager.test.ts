import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Queue } from "bullmq";
import {
  DefaultWorkerManager,
  createWorkerManager,
} from "../../workers/manager";
import { IServiceContainer } from "../../services/container";

// Mock the worker factory
vi.mock("../../workers/factory", () => ({
  createWorkerFactory: vi.fn(),
  WorkerFactory: vi.fn(),
}));

// Import the mocked factory
import { createWorkerFactory, WorkerFactory } from "../../workers/factory";

// Mock Worker class
const MockWorker = vi.fn().mockImplementation(() => ({
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(),
  Worker: MockWorker,
}));

describe("Worker Manager", () => {
  let mockContainer: IServiceContainer;
  let mockWorkerFactory: WorkerFactory;
  let manager: DefaultWorkerManager;
  let mockWorkers: Record<string, any>;

  beforeEach(() => {
    console.log("🧪 Setting up test environment...");

    // Reset all mocks
    vi.clearAllMocks();

    // Create mock workers
    mockWorkers = {
      note: {
        name: "note-worker",
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      ingredient: {
        name: "ingredient-worker",
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      instruction: {
        name: "instruction-worker",
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      image: {
        name: "image-worker",
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      categorization: {
        name: "categorization-worker",
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
    };

    // Create mock worker factory
    mockWorkerFactory = {
      createNoteWorker: vi.fn().mockReturnValue(mockWorkers.note),
      createIngredientWorker: vi.fn().mockReturnValue(mockWorkers.ingredient),
      createInstructionWorker: vi.fn().mockReturnValue(mockWorkers.instruction),
      createImageWorker: vi.fn().mockReturnValue(mockWorkers.image),
      createCategorizationWorker: vi
        .fn()
        .mockReturnValue(mockWorkers.categorization),
    };

    // Mock the factory creation
    vi.mocked(createWorkerFactory).mockReturnValue(mockWorkerFactory);

    // Create mock container
    mockContainer = {
      queues: {
        noteQueue: { name: "note-queue" } as Queue,
        imageQueue: { name: "image-queue" } as Queue,
        ingredientQueue: { name: "ingredient-queue" } as Queue,
        instructionQueue: { name: "instruction-queue" } as Queue,
        categorizationQueue: { name: "categorization-queue" } as Queue,
      },
      database: {
        prisma: {} as any,
      },
      errorHandler: {
        errorHandler: {} as any,
      },
      healthMonitor: {
        healthMonitor: {} as any,
      },
      webSocket: {
        webSocketManager: null,
      },
      logger: {
        log: vi.fn(),
      },
      config: {
        port: 3000,
        wsPort: 8080,
        redisConnection: {} as any,
        batchSize: 10,
        maxRetries: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
      close: vi.fn(),
    };

    // Create manager instance
    manager = new DefaultWorkerManager(mockContainer);
  });

  afterEach(() => {
    console.log("🧹 Cleaning up test environment...");
  });

  describe("DefaultWorkerManager", () => {
    describe("constructor", () => {
      it("should create manager with container and worker factory", () => {
        expect(manager).toBeInstanceOf(DefaultWorkerManager);
        expect(createWorkerFactory).toHaveBeenCalledWith(mockContainer);
      });

      it("should initialize empty workers map", () => {
        const status = manager.getWorkerStatus();
        expect(status).toEqual({});
      });
    });

    describe("startAllWorkers", () => {
      it("should create and start all workers successfully", () => {
        manager.startAllWorkers();

        // Verify all workers were created
        expect(mockWorkerFactory.createNoteWorker).toHaveBeenCalledWith(
          mockContainer.queues.noteQueue
        );
        expect(mockWorkerFactory.createIngredientWorker).toHaveBeenCalledWith(
          mockContainer.queues.ingredientQueue
        );
        expect(mockWorkerFactory.createInstructionWorker).toHaveBeenCalledWith(
          mockContainer.queues.instructionQueue
        );
        expect(mockWorkerFactory.createImageWorker).toHaveBeenCalledWith(
          mockContainer.queues.imageQueue
        );
        expect(
          mockWorkerFactory.createCategorizationWorker
        ).toHaveBeenCalledWith(mockContainer.queues.categorizationQueue);

        // Verify success log
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "All workers started successfully"
        );
      });

      it("should store all workers in the workers map", () => {
        manager.startAllWorkers();

        const status = manager.getWorkerStatus();
        expect(status).toEqual({
          note: true,
          ingredient: true,
          instruction: true,
          image: true,
          categorization: true,
        });
      });

      it("should handle errors during worker creation", () => {
        const error = new Error("Worker creation failed");
        vi.mocked(mockWorkerFactory.createNoteWorker).mockImplementation(() => {
          throw error;
        });

        expect(() => manager.startAllWorkers()).toThrow(
          "Worker creation failed"
        );
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "Error starting workers: Error: Worker creation failed",
          "error"
        );
      });

      it("should handle errors in ingredient worker creation", () => {
        const error = new Error("Ingredient worker failed");
        vi.mocked(mockWorkerFactory.createIngredientWorker).mockImplementation(
          () => {
            throw error;
          }
        );

        expect(() => manager.startAllWorkers()).toThrow(
          "Ingredient worker failed"
        );
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "Error starting workers: Error: Ingredient worker failed",
          "error"
        );
      });

      it("should handle errors in instruction worker creation", () => {
        const error = new Error("Instruction worker failed");
        vi.mocked(mockWorkerFactory.createInstructionWorker).mockImplementation(
          () => {
            throw error;
          }
        );

        expect(() => manager.startAllWorkers()).toThrow(
          "Instruction worker failed"
        );
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "Error starting workers: Error: Instruction worker failed",
          "error"
        );
      });

      it("should handle errors in image worker creation", () => {
        const error = new Error("Image worker failed");
        vi.mocked(mockWorkerFactory.createImageWorker).mockImplementation(
          () => {
            throw error;
          }
        );

        expect(() => manager.startAllWorkers()).toThrow("Image worker failed");
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "Error starting workers: Error: Image worker failed",
          "error"
        );
      });

      it("should handle errors in categorization worker creation", () => {
        const error = new Error("Categorization worker failed");
        vi.mocked(
          mockWorkerFactory.createCategorizationWorker
        ).mockImplementation(() => {
          throw error;
        });

        expect(() => manager.startAllWorkers()).toThrow(
          "Categorization worker failed"
        );
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "Error starting workers: Error: Categorization worker failed",
          "error"
        );
      });
    });

    describe("stopAllWorkers", () => {
      beforeEach(() => {
        // Start workers first
        manager.startAllWorkers();
      });

      it("should stop all workers successfully", async () => {
        await manager.stopAllWorkers();

        // Verify all workers were closed
        expect(mockWorkers.note.close).toHaveBeenCalled();
        expect(mockWorkers.ingredient.close).toHaveBeenCalled();
        expect(mockWorkers.instruction.close).toHaveBeenCalled();
        expect(mockWorkers.image.close).toHaveBeenCalled();
        expect(mockWorkers.categorization.close).toHaveBeenCalled();

        // Verify success log
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "All workers stopped successfully"
        );

        // Verify workers map is cleared
        const status = manager.getWorkerStatus();
        expect(status).toEqual({});
      });

      it("should handle workers without close method", async () => {
        // Create workers without close method
        const workersWithoutClose = {
          note: { name: "note-worker" },
          ingredient: { name: "ingredient-worker" },
          instruction: { name: "instruction-worker" },
          image: { name: "image-worker" },
          categorization: { name: "categorization-worker" },
        };

        vi.mocked(mockWorkerFactory.createNoteWorker).mockReturnValue(
          workersWithoutClose.note
        );
        vi.mocked(mockWorkerFactory.createIngredientWorker).mockReturnValue(
          workersWithoutClose.ingredient
        );
        vi.mocked(mockWorkerFactory.createInstructionWorker).mockReturnValue(
          workersWithoutClose.instruction
        );
        vi.mocked(mockWorkerFactory.createImageWorker).mockReturnValue(
          workersWithoutClose.image
        );
        vi.mocked(mockWorkerFactory.createCategorizationWorker).mockReturnValue(
          workersWithoutClose.categorization
        );

        // Create new manager with workers without close method
        const newManager = new DefaultWorkerManager(mockContainer);
        newManager.startAllWorkers();

        // Should not throw error
        await expect(newManager.stopAllWorkers()).resolves.not.toThrow();
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "All workers stopped successfully"
        );
      });

      it("should handle errors during worker shutdown", async () => {
        const error = new Error("Worker close failed");
        vi.mocked(mockWorkers.note.close).mockRejectedValue(error);

        // Promise.allSettled doesn't throw, so this should resolve
        await expect(manager.stopAllWorkers()).resolves.not.toThrow();

        // But the error should be logged
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "All workers stopped successfully"
        );
      });

      it("should continue stopping other workers even if one fails", async () => {
        const error = new Error("Note worker close failed");
        vi.mocked(mockWorkers.note.close).mockRejectedValue(error);

        // Should still call close on other workers and resolve (Promise.allSettled)
        await expect(manager.stopAllWorkers()).resolves.not.toThrow();

        expect(mockWorkers.ingredient.close).toHaveBeenCalled();
        expect(mockWorkers.instruction.close).toHaveBeenCalled();
        expect(mockWorkers.image.close).toHaveBeenCalled();
        expect(mockWorkers.categorization.close).toHaveBeenCalled();
      });

      it("should handle null workers", async () => {
        // Create manager with null workers
        const nullWorkers = {
          note: null,
          ingredient: null,
          instruction: null,
          image: null,
          categorization: null,
        };

        vi.mocked(mockWorkerFactory.createNoteWorker).mockReturnValue(
          nullWorkers.note
        );
        vi.mocked(mockWorkerFactory.createIngredientWorker).mockReturnValue(
          nullWorkers.ingredient
        );
        vi.mocked(mockWorkerFactory.createInstructionWorker).mockReturnValue(
          nullWorkers.instruction
        );
        vi.mocked(mockWorkerFactory.createImageWorker).mockReturnValue(
          nullWorkers.image
        );
        vi.mocked(mockWorkerFactory.createCategorizationWorker).mockReturnValue(
          nullWorkers.categorization
        );

        const newManager = new DefaultWorkerManager(mockContainer);
        newManager.startAllWorkers();

        // Should not throw error
        await expect(newManager.stopAllWorkers()).resolves.not.toThrow();
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "All workers stopped successfully"
        );
      });

      it("should handle undefined workers", async () => {
        // Create manager with undefined workers
        const undefinedWorkers = {
          note: undefined,
          ingredient: undefined,
          instruction: undefined,
          image: undefined,
          categorization: undefined,
        };

        vi.mocked(mockWorkerFactory.createNoteWorker).mockReturnValue(
          undefinedWorkers.note as any
        );
        vi.mocked(mockWorkerFactory.createIngredientWorker).mockReturnValue(
          undefinedWorkers.ingredient as any
        );
        vi.mocked(mockWorkerFactory.createInstructionWorker).mockReturnValue(
          undefinedWorkers.instruction as any
        );
        vi.mocked(mockWorkerFactory.createImageWorker).mockReturnValue(
          undefinedWorkers.image as any
        );
        vi.mocked(mockWorkerFactory.createCategorizationWorker).mockReturnValue(
          undefinedWorkers.categorization as any
        );

        const newManager = new DefaultWorkerManager(mockContainer);
        newManager.startAllWorkers();

        // Should not throw error
        await expect(newManager.stopAllWorkers()).resolves.not.toThrow();
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "All workers stopped successfully"
        );
      });

      it("should handle errors in stopAllWorkers catch block", async () => {
        // Mock workers.clear() to throw an error
        const error = new Error("Clear failed");
        const mockClear = vi.fn().mockImplementation(() => {
          throw error;
        });

        // Create a manager and start workers
        manager.startAllWorkers();

        // Mock the workers.clear method to throw
        const originalClear = manager["workers"].clear;
        manager["workers"].clear = mockClear;

        // Should throw the error
        await expect(manager.stopAllWorkers()).rejects.toThrow("Clear failed");
        expect(mockContainer.logger.log).toHaveBeenCalledWith(
          "Error stopping workers: Error: Clear failed",
          "error"
        );

        // Restore original method
        manager["workers"].clear = originalClear;
      });
    });

    describe("getWorkerStatus", () => {
      it("should return empty status when no workers are started", () => {
        const status = manager.getWorkerStatus();
        expect(status).toEqual({});
      });

      it("should return status of all started workers", () => {
        manager.startAllWorkers();

        const status = manager.getWorkerStatus();
        expect(status).toEqual({
          note: true,
          ingredient: true,
          instruction: true,
          image: true,
          categorization: true,
        });
      });

      it("should return false for null workers", () => {
        const nullWorkers = {
          note: null,
          ingredient: null,
          instruction: null,
          image: null,
          categorization: null,
        };

        vi.mocked(mockWorkerFactory.createNoteWorker).mockReturnValue(
          nullWorkers.note
        );
        vi.mocked(mockWorkerFactory.createIngredientWorker).mockReturnValue(
          nullWorkers.ingredient
        );
        vi.mocked(mockWorkerFactory.createInstructionWorker).mockReturnValue(
          nullWorkers.instruction
        );
        vi.mocked(mockWorkerFactory.createImageWorker).mockReturnValue(
          nullWorkers.image
        );
        vi.mocked(mockWorkerFactory.createCategorizationWorker).mockReturnValue(
          nullWorkers.categorization
        );

        const newManager = new DefaultWorkerManager(mockContainer);
        newManager.startAllWorkers();

        const status = newManager.getWorkerStatus();
        expect(status).toEqual({
          note: false,
          ingredient: false,
          instruction: false,
          image: false,
          categorization: false,
        });
      });

      it("should return false for undefined workers", () => {
        const undefinedWorkers = {
          note: undefined,
          ingredient: undefined,
          instruction: undefined,
          image: undefined,
          categorization: undefined,
        };

        vi.mocked(mockWorkerFactory.createNoteWorker).mockReturnValue(
          undefinedWorkers.note
        );
        vi.mocked(mockWorkerFactory.createIngredientWorker).mockReturnValue(
          undefinedWorkers.ingredient
        );
        vi.mocked(mockWorkerFactory.createInstructionWorker).mockReturnValue(
          undefinedWorkers.instruction
        );
        vi.mocked(mockWorkerFactory.createImageWorker).mockReturnValue(
          undefinedWorkers.image
        );
        vi.mocked(mockWorkerFactory.createCategorizationWorker).mockReturnValue(
          undefinedWorkers.categorization
        );

        const newManager = new DefaultWorkerManager(mockContainer);
        newManager.startAllWorkers();

        const status = newManager.getWorkerStatus();
        expect(status).toEqual({
          note: false,
          ingredient: false,
          instruction: false,
          image: false,
          categorization: false,
        });
      });

      it("should return updated status after stopping workers", async () => {
        manager.startAllWorkers();
        expect(manager.getWorkerStatus()).toEqual({
          note: true,
          ingredient: true,
          instruction: true,
          image: true,
          categorization: true,
        });

        await manager.stopAllWorkers();
        expect(manager.getWorkerStatus()).toEqual({});
      });
    });

    describe("WorkerManager interface implementation", () => {
      it("should implement all WorkerManager methods", () => {
        expect(typeof manager.startAllWorkers).toBe("function");
        expect(typeof manager.stopAllWorkers).toBe("function");
        expect(typeof manager.getWorkerStatus).toBe("function");
      });

      it("should handle complete lifecycle", async () => {
        // Start workers
        manager.startAllWorkers();
        expect(manager.getWorkerStatus()).toEqual({
          note: true,
          ingredient: true,
          instruction: true,
          image: true,
          categorization: true,
        });

        // Stop workers
        await manager.stopAllWorkers();
        expect(manager.getWorkerStatus()).toEqual({});
      });
    });
  });

  describe("createWorkerManager function", () => {
    it("should create DefaultWorkerManager with container", () => {
      const result = createWorkerManager(mockContainer);

      expect(result).toBeInstanceOf(DefaultWorkerManager);
    });

    it("should return manager that implements WorkerManager interface", () => {
      const manager = createWorkerManager(mockContainer);

      expect(typeof manager.startAllWorkers).toBe("function");
      expect(typeof manager.stopAllWorkers).toBe("function");
      expect(typeof manager.getWorkerStatus).toBe("function");
    });

    it("should pass container to DefaultWorkerManager constructor", () => {
      const customContainer = {
        ...mockContainer,
        config: {
          ...mockContainer.config,
          port: 9999,
        },
      };

      createWorkerManager(customContainer);

      expect(createWorkerFactory).toHaveBeenCalledWith(customContainer);
    });
  });

  describe("Integration tests", () => {
    it("should handle multiple start/stop cycles", async () => {
      // First cycle
      manager.startAllWorkers();
      expect(manager.getWorkerStatus()).toEqual({
        note: true,
        ingredient: true,
        instruction: true,
        image: true,
        categorization: true,
      });

      await manager.stopAllWorkers();
      expect(manager.getWorkerStatus()).toEqual({});

      // Second cycle
      manager.startAllWorkers();
      expect(manager.getWorkerStatus()).toEqual({
        note: true,
        ingredient: true,
        instruction: true,
        image: true,
        categorization: true,
      });

      await manager.stopAllWorkers();
      expect(manager.getWorkerStatus()).toEqual({});
    });

    it("should handle partial worker failures", async () => {
      // Mock some workers to fail creation
      const error = new Error("Partial failure");
      vi.mocked(mockWorkerFactory.createNoteWorker).mockImplementation(() => {
        throw error;
      });

      // Should throw error and not start any workers
      expect(() => manager.startAllWorkers()).toThrow("Partial failure");
      expect(manager.getWorkerStatus()).toEqual({});
    });

    it("should handle mixed worker types (some with close, some without)", async () => {
      const mixedWorkers = {
        note: {
          name: "note-worker",
          close: vi.fn().mockResolvedValue(undefined),
        },
        ingredient: { name: "ingredient-worker" }, // No close method
        instruction: {
          name: "instruction-worker",
          close: vi.fn().mockResolvedValue(undefined),
        },
        image: null, // Null worker
        categorization: {
          name: "categorization-worker",
          close: vi.fn().mockResolvedValue(undefined),
        },
      };

      vi.mocked(mockWorkerFactory.createNoteWorker).mockReturnValue(
        mixedWorkers.note
      );
      vi.mocked(mockWorkerFactory.createIngredientWorker).mockReturnValue(
        mixedWorkers.ingredient
      );
      vi.mocked(mockWorkerFactory.createInstructionWorker).mockReturnValue(
        mixedWorkers.instruction
      );
      vi.mocked(mockWorkerFactory.createImageWorker).mockReturnValue(
        mixedWorkers.image
      );
      vi.mocked(mockWorkerFactory.createCategorizationWorker).mockReturnValue(
        mixedWorkers.categorization
      );

      const newManager = new DefaultWorkerManager(mockContainer);
      newManager.startAllWorkers();

      const status = newManager.getWorkerStatus();
      expect(status).toEqual({
        note: true,
        ingredient: true,
        instruction: true,
        image: false,
        categorization: true,
      });

      // Should handle stopping mixed workers
      await expect(newManager.stopAllWorkers()).resolves.not.toThrow();
      expect(mixedWorkers.note.close).toHaveBeenCalled();
      expect(mixedWorkers.instruction.close).toHaveBeenCalled();
      expect(mixedWorkers.categorization.close).toHaveBeenCalled();
    });
  });
});

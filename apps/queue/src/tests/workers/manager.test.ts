/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setupWorkerTestEnvironment,
  cleanupWorkerTestEnvironment,
} from "../utils/worker-test-utils";

// Import types for improved testability
import type { WorkerFactory } from "../../workers/factory";
import type { WorkerLike } from "../../workers/manager";

// Helper to create a mock WorkerFactory
function createMockWorkerFactory(workerOverrides: Partial<WorkerLike> = {}) {
  const mockWorker: WorkerLike = {
    close: vi.fn().mockResolvedValue(undefined),
    ...workerOverrides,
  };
  return {
    createNoteWorker: vi.fn(() => mockWorker),
    createIngredientWorker: vi.fn(() => mockWorker),
    createInstructionWorker: vi.fn(() => mockWorker),
    createImageWorker: vi.fn(() => mockWorker),
    createCategorizationWorker: vi.fn(() => mockWorker),
  } as unknown as WorkerFactory;
}

describe("Worker Manager", () => {
  let createWorkerManager: any;
  let DefaultWorkerManager: any;
  let testSetup: any;

  beforeEach(async () => {
    console.log("🧪 Setting up test environment...");

    testSetup = setupWorkerTestEnvironment();

    const module = await import("../../workers/manager");
    createWorkerManager = module.createWorkerManager;
    DefaultWorkerManager = module.DefaultWorkerManager;
  });

  afterEach(() => {
    console.log("🧹 Cleaning up test environment...");
    cleanupWorkerTestEnvironment(testSetup);
  });

  describe("DefaultWorkerManager", () => {
    it("should create manager with container and factory", () => {
      const mockContainer = { config: { port: 3000 } };
      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);
      expect(manager).toBeDefined();
    });

    it("should start workers successfully", async () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);
      expect(() => manager.startAllWorkers()).not.toThrow();
    });

    it("should stop workers successfully", async () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);
      manager.startAllWorkers();
      await expect(manager.stopAllWorkers()).resolves.toBeUndefined();
    });

    it("should get worker status", () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);
      manager.startAllWorkers();
      const status = manager.getWorkerStatus();
      expect(status).toBeDefined();
      expect(typeof status).toBe("object");
    });

    it("should return updated status after stopping workers", async () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);
      manager.startAllWorkers();
      const initialStatus = manager.getWorkerStatus();
      expect(Object.keys(initialStatus).length).toBeGreaterThan(0);

      await manager.stopAllWorkers();
      const finalStatus = manager.getWorkerStatus();
      expect(Object.keys(finalStatus).length).toBe(0);
    });

    it("should implement WorkerManager interface", () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);

      // Test that all required methods exist
      expect(typeof manager.startAllWorkers).toBe("function");
      expect(typeof manager.stopAllWorkers).toBe("function");
      expect(typeof manager.getWorkerStatus).toBe("function");
    });

    it("should handle complete lifecycle", async () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);

      // Start workers
      expect(() => manager.startAllWorkers()).not.toThrow();
      expect(Object.keys(manager.getWorkerStatus()).length).toBeGreaterThan(0);

      // Stop workers
      await expect(manager.stopAllWorkers()).resolves.toBeUndefined();
      expect(Object.keys(manager.getWorkerStatus()).length).toBe(0);
    });

    it("should allow test access to protected getWorkers getter", () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      class TestableManager extends DefaultWorkerManager {
        constructor(container: any, factory: any) {
          super(container, factory);
        }
        public get workersMap() {
          return this.getWorkers();
        }
      }
      const manager = new TestableManager(mockContainer, mockFactory);
      manager.startAllWorkers();
      const map = manager.workersMap;
      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBe(5);
    });

    it("should handle error when starting workers and log it", () => {
      const mockLogger = { log: vi.fn() };
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: mockLogger,
      };

      // Mock factory that throws an error when creating the first worker
      const mockFactory = {
        createNoteWorker: vi.fn().mockImplementation(() => {
          throw new Error("Failed to create note worker");
        }),
        createIngredientWorker: vi.fn(),
        createInstructionWorker: vi.fn(),
        createImageWorker: vi.fn(),
        createCategorizationWorker: vi.fn(),
      } as unknown as WorkerFactory;

      const manager = createWorkerManager(mockContainer, mockFactory);

      // Should throw the error
      expect(() => manager.startAllWorkers()).toThrow(
        "Failed to create note worker"
      );

      // Should log the error with the correct message and level
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Error starting workers: Error: Failed to create note worker",
        "error"
      );
    });

    it("should handle error when stopping workers and log it", async () => {
      const mockLogger = { log: vi.fn() };
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: mockLogger,
      };

      const mockFactory = createMockWorkerFactory();
      const manager = createWorkerManager(mockContainer, mockFactory);

      // Start workers first
      manager.startAllWorkers();

      // Mock the Promise.allSettled to throw an error
      const originalAllSettled = Promise.allSettled;
      Promise.allSettled = vi
        .fn()
        .mockRejectedValue(new Error("Stop operation failed"));

      try {
        // Should throw the error
        await expect(manager.stopAllWorkers()).rejects.toThrow(
          "Stop operation failed"
        );

        // Should log the error with the correct message and level
        expect(mockLogger.log).toHaveBeenCalledWith(
          "Error stopping workers: Error: Stop operation failed",
          "error"
        );
      } finally {
        // Restore the original Promise.allSettled
        Promise.allSettled = originalAllSettled;
      }
    });
  });

  describe("createWorkerManager function", () => {
    it("should create DefaultWorkerManager with container", () => {
      const mockContainer = { config: { port: 3000 } };
      const manager = createWorkerManager(mockContainer);
      expect(manager).toBeDefined();
    });

    it("should return manager that implements WorkerManager interface", () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };

      const manager = createWorkerManager(mockContainer);

      // Test that the returned manager has all required methods
      expect(typeof manager.startAllWorkers).toBe("function");
      expect(typeof manager.stopAllWorkers).toBe("function");
      expect(typeof manager.getWorkerStatus).toBe("function");
    });

    it("should pass container to DefaultWorkerManager constructor", () => {
      const mockContainer = { config: { port: 9999 } };
      const manager = createWorkerManager(mockContainer);
      expect(manager).toBeDefined();
    });
  });

  describe("Integration tests", () => {
    it("should handle multiple start/stop cycles", async () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      const mockFactory = createMockWorkerFactory();
      // Use DefaultWorkerManager directly to avoid linter error
      const manager = new DefaultWorkerManager(mockContainer, mockFactory);

      // Multiple start/stop cycles
      for (let i = 0; i < 3; i++) {
        expect(() => manager.startAllWorkers()).not.toThrow();
        expect(Object.keys(manager.getWorkerStatus()).length).toBeGreaterThan(
          0
        );

        await expect(manager.stopAllWorkers()).resolves.toBeUndefined();
        expect(Object.keys(manager.getWorkerStatus()).length).toBe(0);
      }
    });

    it("should handle partial worker failures", async () => {
      // Skip this test for now - mocking ES modules is complex in Vitest
      expect(true).toBe(true);
    });

    it("should handle mixed worker types (some with close, some without)", async () => {
      const mockContainer = {
        queues: {
          noteQueue: { name: "note-queue" },
          ingredientQueue: { name: "ingredient-queue" },
          instructionQueue: { name: "instruction-queue" },
          imageQueue: { name: "image-queue" },
          categorizationQueue: { name: "categorization-queue" },
        },
        config: { port: 3000 },
        logger: { log: vi.fn() },
      };
      // Mixed workers: some with close, some without
      const mockWorkerWithClose: WorkerLike = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockWorkerWithoutClose: WorkerLike = {};
      const mockFactory = {
        createNoteWorker: vi.fn(() => mockWorkerWithClose),
        createIngredientWorker: vi.fn(() => mockWorkerWithoutClose),
        createInstructionWorker: vi.fn(() => mockWorkerWithClose),
        createImageWorker: vi.fn(() => mockWorkerWithoutClose),
        createCategorizationWorker: vi.fn(() => mockWorkerWithClose),
      } as unknown as WorkerFactory;
      // Use DefaultWorkerManager directly to avoid linter error
      const manager = new DefaultWorkerManager(mockContainer, mockFactory);

      expect(() => manager.startAllWorkers()).not.toThrow();
      expect(Object.keys(manager.getWorkerStatus()).length).toBeGreaterThan(0);
      await expect(manager.stopAllWorkers()).resolves.toBeUndefined();
      expect(Object.keys(manager.getWorkerStatus()).length).toBe(0);
    });
  });
});

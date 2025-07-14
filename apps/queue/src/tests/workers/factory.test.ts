import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Queue } from "bullmq";
import {
  DefaultWorkerFactory,
  createWorkerFactory,
} from "../../workers/factory";
import { IServiceContainer } from "../../services/container";

// Mock the worker setup functions
vi.mock("../../workers/note", () => ({
  setupNoteWorker: vi.fn(),
}));

vi.mock("../../workers/ingredient", () => ({
  setupIngredientWorker: vi.fn(),
}));

vi.mock("../../workers/instruction", () => ({
  setupInstructionWorker: vi.fn(),
}));

vi.mock("../../workers/image", () => ({
  setupImageWorker: vi.fn(),
}));

vi.mock("../../workers/categorization", () => ({
  setupCategorizationWorker: vi.fn(),
}));

// Import the mocked functions
import { setupNoteWorker } from "../../workers/note";
import { setupIngredientWorker } from "../../workers/ingredient";
import { setupInstructionWorker } from "../../workers/instruction";
import { setupImageWorker } from "../../workers/image";
import { setupCategorizationWorker } from "../../workers/categorization";

// Mock Worker class
const MockWorker = vi.fn().mockImplementation(() => ({
  on: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(),
  Worker: MockWorker,
}));

describe("Worker Factory", () => {
  let mockContainer: IServiceContainer;
  let mockQueue: Queue;
  let factory: DefaultWorkerFactory;

  beforeEach(() => {
    console.log("🧪 Setting up test environment...");

    // Reset all mocks
    vi.clearAllMocks();

    // Create mock container
    mockContainer = {
      queues: {
        noteQueue: {} as Queue,
        imageQueue: {} as Queue,
        ingredientQueue: {} as Queue,
        instructionQueue: {} as Queue,
        categorizationQueue: {} as Queue,
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

    // Create mock queue
    mockQueue = {
      name: "test-queue",
    } as Queue;

    // Create factory instance
    factory = new DefaultWorkerFactory(mockContainer);
  });

  afterEach(() => {
    console.log("🧹 Cleaning up test environment...");
  });

  describe("DefaultWorkerFactory", () => {
    describe("constructor", () => {
      it("should create factory with container", () => {
        expect(factory).toBeInstanceOf(DefaultWorkerFactory);
        expect(factory).toHaveProperty("container", mockContainer);
      });
    });

    describe("createNoteWorker", () => {
      it("should call setupNoteWorker with queue", () => {
        const mockWorker = {} as any;
        vi.mocked(setupNoteWorker).mockReturnValue(mockWorker);

        const result = factory.createNoteWorker(mockQueue);

        expect(setupNoteWorker).toHaveBeenCalledWith(mockQueue);
        expect(result).toBe(mockWorker);
      });

      it("should return worker from setupNoteWorker", () => {
        const mockWorker = { name: "note-worker" } as any;
        vi.mocked(setupNoteWorker).mockReturnValue(mockWorker);

        const result = factory.createNoteWorker(mockQueue);

        expect(result).toBe(mockWorker);
      });
    });

    describe("createIngredientWorker", () => {
      it("should call setupIngredientWorker with queue", () => {
        const mockWorker = {} as any;
        vi.mocked(setupIngredientWorker).mockReturnValue(mockWorker);

        const result = factory.createIngredientWorker(mockQueue);

        expect(setupIngredientWorker).toHaveBeenCalledWith(mockQueue);
        expect(result).toBe(mockWorker);
      });

      it("should return worker from setupIngredientWorker", () => {
        const mockWorker = { name: "ingredient-worker" } as any;
        vi.mocked(setupIngredientWorker).mockReturnValue(mockWorker);

        const result = factory.createIngredientWorker(mockQueue);

        expect(result).toBe(mockWorker);
      });
    });

    describe("createInstructionWorker", () => {
      it("should call setupInstructionWorker with queue", () => {
        const mockWorker = {} as any;
        vi.mocked(setupInstructionWorker).mockReturnValue(mockWorker);

        const result = factory.createInstructionWorker(mockQueue);

        expect(setupInstructionWorker).toHaveBeenCalledWith(mockQueue);
        expect(result).toBe(mockWorker);
      });

      it("should return worker from setupInstructionWorker", () => {
        const mockWorker = { name: "instruction-worker" } as any;
        vi.mocked(setupInstructionWorker).mockReturnValue(mockWorker);

        const result = factory.createInstructionWorker(mockQueue);

        expect(result).toBe(mockWorker);
      });
    });

    describe("createImageWorker", () => {
      it("should call setupImageWorker with queue", () => {
        const mockWorker = {} as any;
        vi.mocked(setupImageWorker).mockReturnValue(mockWorker);

        const result = factory.createImageWorker(mockQueue);

        expect(setupImageWorker).toHaveBeenCalledWith(mockQueue);
        expect(result).toBe(mockWorker);
      });

      it("should return worker from setupImageWorker", () => {
        const mockWorker = { name: "image-worker" } as any;
        vi.mocked(setupImageWorker).mockReturnValue(mockWorker);

        const result = factory.createImageWorker(mockQueue);

        expect(result).toBe(mockWorker);
      });
    });

    describe("createCategorizationWorker", () => {
      it("should call setupCategorizationWorker with queue", () => {
        const mockWorker = {} as any;
        vi.mocked(setupCategorizationWorker).mockReturnValue(mockWorker);

        const result = factory.createCategorizationWorker(mockQueue);

        expect(setupCategorizationWorker).toHaveBeenCalledWith(mockQueue);
        expect(result).toBe(mockWorker);
      });

      it("should return worker from setupCategorizationWorker", () => {
        const mockWorker = { name: "categorization-worker" } as any;
        vi.mocked(setupCategorizationWorker).mockReturnValue(mockWorker);

        const result = factory.createCategorizationWorker(mockQueue);

        expect(result).toBe(mockWorker);
      });
    });

    describe("WorkerFactory interface implementation", () => {
      it("should implement all WorkerFactory methods", () => {
        const mockWorker = { name: "test-worker" } as any;

        vi.mocked(setupNoteWorker).mockReturnValue(mockWorker);
        vi.mocked(setupIngredientWorker).mockReturnValue(mockWorker);
        vi.mocked(setupInstructionWorker).mockReturnValue(mockWorker);
        vi.mocked(setupImageWorker).mockReturnValue(mockWorker);
        vi.mocked(setupCategorizationWorker).mockReturnValue(mockWorker);

        // Test that all methods exist and return workers
        expect(factory.createNoteWorker(mockQueue)).toBe(mockWorker);
        expect(factory.createIngredientWorker(mockQueue)).toBe(mockWorker);
        expect(factory.createInstructionWorker(mockQueue)).toBe(mockWorker);
        expect(factory.createImageWorker(mockQueue)).toBe(mockWorker);
        expect(factory.createCategorizationWorker(mockQueue)).toBe(mockWorker);
      });
    });
  });

  describe("createWorkerFactory function", () => {
    it("should create DefaultWorkerFactory with container", () => {
      const result = createWorkerFactory(mockContainer);

      expect(result).toBeInstanceOf(DefaultWorkerFactory);
      expect(result).toHaveProperty("container", mockContainer);
    });

    it("should return factory that implements WorkerFactory interface", () => {
      const mockWorker = { name: "test-worker" } as any;

      vi.mocked(setupNoteWorker).mockReturnValue(mockWorker);
      vi.mocked(setupIngredientWorker).mockReturnValue(mockWorker);
      vi.mocked(setupInstructionWorker).mockReturnValue(mockWorker);
      vi.mocked(setupImageWorker).mockReturnValue(mockWorker);
      vi.mocked(setupCategorizationWorker).mockReturnValue(mockWorker);

      const factory = createWorkerFactory(mockContainer);

      // Test that the returned factory has all required methods
      expect(typeof factory.createNoteWorker).toBe("function");
      expect(typeof factory.createIngredientWorker).toBe("function");
      expect(typeof factory.createInstructionWorker).toBe("function");
      expect(typeof factory.createImageWorker).toBe("function");
      expect(typeof factory.createCategorizationWorker).toBe("function");

      // Test that methods work correctly
      expect(factory.createNoteWorker(mockQueue)).toBe(mockWorker);
      expect(factory.createIngredientWorker(mockQueue)).toBe(mockWorker);
      expect(factory.createInstructionWorker(mockQueue)).toBe(mockWorker);
      expect(factory.createImageWorker(mockQueue)).toBe(mockWorker);
      expect(factory.createCategorizationWorker(mockQueue)).toBe(mockWorker);
    });

    it("should pass container to DefaultWorkerFactory constructor", () => {
      const customContainer = {
        ...mockContainer,
        config: {
          ...mockContainer.config,
          port: 9999,
        },
      };

      const result = createWorkerFactory(customContainer);

      expect(result).toHaveProperty("container", customContainer);
    });
  });

  describe("Integration tests", () => {
    it("should create all worker types with different queues", () => {
      const mockWorker = { name: "test-worker" } as any;
      const queues = [
        { name: "note-queue" } as Queue,
        { name: "ingredient-queue" } as Queue,
        { name: "instruction-queue" } as Queue,
        { name: "image-queue" } as Queue,
        { name: "categorization-queue" } as Queue,
      ];

      vi.mocked(setupNoteWorker).mockReturnValue(mockWorker);
      vi.mocked(setupIngredientWorker).mockReturnValue(mockWorker);
      vi.mocked(setupInstructionWorker).mockReturnValue(mockWorker);
      vi.mocked(setupImageWorker).mockReturnValue(mockWorker);
      vi.mocked(setupCategorizationWorker).mockReturnValue(mockWorker);

      const factory = createWorkerFactory(mockContainer);

      // Create all worker types
      const workers = [
        factory.createNoteWorker(queues[0]!),
        factory.createIngredientWorker(queues[1]!),
        factory.createInstructionWorker(queues[2]!),
        factory.createImageWorker(queues[3]!),
        factory.createCategorizationWorker(queues[4]!),
      ];

      // Verify all workers were created
      expect(workers).toHaveLength(5);
      workers.forEach((worker) => expect(worker).toBe(mockWorker));

      // Verify setup functions were called with correct queues
      expect(setupNoteWorker).toHaveBeenCalledWith(queues[0]);
      expect(setupIngredientWorker).toHaveBeenCalledWith(queues[1]);
      expect(setupInstructionWorker).toHaveBeenCalledWith(queues[2]);
      expect(setupImageWorker).toHaveBeenCalledWith(queues[3]);
      expect(setupCategorizationWorker).toHaveBeenCalledWith(queues[4]);
    });

    it("should handle multiple calls to same worker creation method", () => {
      const mockWorker1 = { name: "worker-1" } as any;
      const mockWorker2 = { name: "worker-2" } as any;

      vi.mocked(setupNoteWorker)
        .mockReturnValueOnce(mockWorker1)
        .mockReturnValueOnce(mockWorker2);

      const factory = createWorkerFactory(mockContainer);

      const worker1 = factory.createNoteWorker(mockQueue);
      const worker2 = factory.createNoteWorker(mockQueue);

      expect(worker1).toBe(mockWorker1);
      expect(worker2).toBe(mockWorker2);
      expect(setupNoteWorker).toHaveBeenCalledTimes(2);
      expect(setupNoteWorker).toHaveBeenCalledWith(mockQueue);
    });
  });
});

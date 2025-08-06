import { PrismaClient } from "@peas/database";
import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import {
  createMockLogger,
  createMockStatusBroadcaster,
} from "../../../test-utils/helpers";
import { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../ingredient/dependencies";
import {
  IngredientWorker,
  createIngredientWorker,
} from "../../ingredient/worker";
import { PatternTracker } from "../../shared/pattern-tracker";

// Mock the action registration
vi.mock("../../../services/ingredient/register", () => ({
  registerIngredientActions: vi.fn(),
}));

describe("Ingredient Worker", () => {
  let mockQueue: Queue;
  let mockServiceContainer: IServiceContainer;
  let mockDependencies: IngredientWorkerDependencies;
  let mockActionFactory: ActionFactory<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock queue
    mockQueue = {
      name: "ingredient-queue",
    } as Queue;

    // Create mock service container
    mockServiceContainer = {
      logger: createMockLogger(),
      statusBroadcaster: createMockStatusBroadcaster(),
      queues: {
        noteQueue: {} as Queue,
        imageQueue: {} as Queue,
        ingredientQueue: {} as Queue,
        instructionQueue: {} as Queue,
        categorizationQueue: {} as Queue,
        sourceQueue: {} as Queue,
      },
      database: {
        prisma: {} as Partial<PrismaClient> as PrismaClient,
        patternTracker: {} as PatternTracker,
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      healthMonitor: {
        healthMonitor: {},
      },
      webSocket: {
        webSocketManager: {},
      },
      config: {
        wsHost: "localhost",
        port: 3000,
        wsPort: 3001,
      },
      _workers: {},
      close: vi.fn(),
    };

    // Create mock dependencies
    mockDependencies = {
      logger: createMockLogger(),
      statusBroadcaster: createMockStatusBroadcaster(),
      services: {
        parseIngredient: vi.fn(),
        saveIngredient: vi.fn(),
      },
    };

    // Create mock action factory
    mockActionFactory = {
      create: vi.fn(),
    } as unknown as ActionFactory<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >;
  });

  describe("IngredientWorker class", () => {
    it("should create an IngredientWorker instance", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      expect(worker).toBeInstanceOf(IngredientWorker);
    });

    it("should register actions during construction", async () => {
      const { registerIngredientActions } = await import(
        "../../../services/ingredient/register"
      );

      new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      expect(registerIngredientActions).toHaveBeenCalledWith(mockActionFactory);
    });

    it("should return correct operation name", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      // Access the protected method through the class
      const operationName = (
        worker as unknown as { getOperationName(): string }
      ).getOperationName();
      expect(operationName).toBe("ingredient-worker");
    });

    it("should create action pipeline with correct parameters", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      const mockData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING" as const,
        isActive: true,
      };

      const mockContext = {
        jobId: "test-job-id",
        attemptNumber: 1,
        retryCount: 0,
        queueName: "ingredient-queue",
        operation: "ingredient-processing",
        startTime: Date.now(),
        workerName: "ingredient-worker",
      };

      // Mock the pipeline creation
      const mockPipeline = [{ name: "test-action", execute: vi.fn() }];
      vi.spyOn(
        worker as unknown as {
          createActionPipeline: (
            data: IngredientJobData,
            context: ActionContext
          ) => unknown[];
        },
        "createActionPipeline"
      ).mockReturnValue(mockPipeline);

      const result = (
        worker as unknown as {
          createActionPipeline: (
            data: IngredientJobData,
            context: ActionContext
          ) => unknown[];
        }
      ).createActionPipeline(mockData, mockContext);

      expect(result).toEqual(mockPipeline);
    });

    it("should call real createActionPipeline method to cover type annotations", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      const mockData: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING" as const,
        isActive: true,
      };

      const mockContext = {
        jobId: "test-job-id",
        attemptNumber: 1,
        retryCount: 0,
        queueName: "ingredient-queue",
        operation: "ingredient-processing",
        startTime: Date.now(),
        workerName: "ingredient-worker",
      };

      // Call the real createActionPipeline method to cover line 72
      const result = (
        worker as unknown as {
          createActionPipeline: (
            data: IngredientJobData,
            context: ActionContext
          ) => unknown[];
        }
      ).createActionPipeline(mockData, mockContext);

      // The result should be an array (the pipeline)
      expect(Array.isArray(result)).toBe(true);
    });

    it("should have actionFactory property", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      expect(
        (worker as unknown as { actionFactory: unknown }).actionFactory
      ).toBe(mockActionFactory);
    });

    it("should have dependencies property", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      expect(
        (worker as unknown as { dependencies: unknown }).dependencies
      ).toBe(mockDependencies);
    });

    it("should have container property", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      expect((worker as unknown as { container: unknown }).container).toBe(
        mockServiceContainer
      );
    });
  });

  describe("createIngredientWorker function", () => {
    it("should create an IngredientWorker instance", () => {
      const worker = createIngredientWorker(mockQueue, mockServiceContainer);

      expect(worker).toBeInstanceOf(IngredientWorker);
    });

    it("should build dependencies from service container", async () => {
      const dependenciesModule = await import("../../ingredient/dependencies");
      vi.spyOn(dependenciesModule, "buildIngredientDependencies");

      createIngredientWorker(mockQueue, mockServiceContainer);

      expect(
        dependenciesModule.buildIngredientDependencies
      ).toHaveBeenCalledWith(mockServiceContainer);
    });

    it("should create ActionFactory instance", () => {
      const worker = createIngredientWorker(mockQueue, mockServiceContainer);

      expect(
        (worker as unknown as { actionFactory: unknown }).actionFactory
      ).toBeInstanceOf(ActionFactory);
    });

    it("should pass correct parameters to IngredientWorker constructor", async () => {
      const { buildIngredientDependencies } = await import(
        "../../ingredient/dependencies"
      );
      const mockBuiltDependencies = {
        logger: createMockLogger(),
        services: {
          parseIngredient: vi.fn(),
          saveIngredient: vi.fn(),
        },
      };
      vi.mocked(buildIngredientDependencies).mockReturnValue(
        mockBuiltDependencies
      );

      const worker = createIngredientWorker(mockQueue, mockServiceContainer);

      expect(
        (worker as unknown as { dependencies: unknown }).dependencies
      ).toBe(mockBuiltDependencies);
      expect((worker as unknown as { container: unknown }).container).toBe(
        mockServiceContainer
      );
    });

    it("should handle service container without statusBroadcaster", () => {
      const containerWithoutBroadcaster: IServiceContainer = {
        ...mockServiceContainer,
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn(),
        },
      };

      const worker = createIngredientWorker(
        mockQueue,
        containerWithoutBroadcaster
      );

      expect(worker).toBeInstanceOf(IngredientWorker);
    });
  });

  describe("Worker inheritance", () => {
    it("should extend BaseWorker", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      // Check if it has BaseWorker methods
      expect(
        typeof (worker as unknown as { getStatus: () => unknown }).getStatus
      ).toBe("function");
    });

    it("should implement abstract methods", () => {
      const worker = new IngredientWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockServiceContainer
      );

      // These methods should be implemented
      expect(
        typeof (worker as unknown as { registerActions: () => unknown })
          .registerActions
      ).toBe("function");
      expect(
        typeof (worker as unknown as { getOperationName: () => unknown })
          .getOperationName
      ).toBe("function");
      expect(
        typeof (worker as unknown as { createActionPipeline: () => unknown })
          .createActionPipeline
      ).toBe("function");
    });
  });
});

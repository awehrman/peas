import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../categorization/dependencies";
import { createCategorizationPipeline } from "../../categorization/pipeline";
import type { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";

// Mock the action factory
const mockActionFactory = {
  create: vi.fn().mockReturnValue({
    name: "mock-action",
    execute: vi.fn(),
  }),
  getRegisteredActions: vi
    .fn()
    .mockReturnValue([
      ActionName.DETERMINE_CATEGORY,
      ActionName.SAVE_CATEGORY,
      ActionName.DETERMINE_TAGS,
      ActionName.SAVE_TAGS,
    ]),
} as unknown as ActionFactory<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
>;

// Mock the dependencies
const mockDependencies: CategorizationWorkerDependencies = {
  logger: {
    log: vi.fn(),
  },
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
  },
  services: {
    determineCategory: vi.fn().mockResolvedValue({}),
    saveCategory: vi.fn().mockResolvedValue({}),
    determineTags: vi.fn().mockResolvedValue({}),
    saveTags: vi.fn().mockResolvedValue({}),
  },
};

// Mock job data
const mockJobData: CategorizationJobData = {
  noteId: "test-note-123",
  importId: "test-import-123",
  jobId: "test-job-123",
  metadata: { test: "value" },
};

// Mock context
const mockContext: ActionContext = {
  jobId: "test-job-123",
  retryCount: 0,
  queueName: "categorization-queue",
  operation: "categorization",
  startTime: Date.now(),
  workerName: "categorization-worker",
  attemptNumber: 1,
};

describe("Categorization Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategorizationPipeline", () => {
    it("should create pipeline with all four categorization actions", () => {
      const pipeline = createCategorizationPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        mockContext
      );

      expect(pipeline).toHaveLength(4);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(4);
    });

    it("should create actions in correct order", () => {
      createCategorizationPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        mockContext
      );

      // Verify the order of action creation calls
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        1,
        ActionName.DETERMINE_CATEGORY,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        2,
        ActionName.SAVE_CATEGORY,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        3,
        ActionName.DETERMINE_TAGS,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        4,
        ActionName.SAVE_TAGS,
        mockDependencies
      );
    });

    it("should return actions with correct structure", () => {
      const pipeline = createCategorizationPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        mockContext
      );

      // Verify each action has the expected structure
      pipeline.forEach((action) => {
        expect(action).toHaveProperty("name");
        expect(action).toHaveProperty("execute");
        expect(typeof action.execute).toBe("function");
      });
    });

    it("should handle action factory errors gracefully", () => {
      // Mock action factory to throw an error
      const failingActionFactory = {
        ...mockActionFactory,
        create: vi.fn().mockImplementation(() => {
          throw new Error("Action creation failed");
        }),
      } as unknown as ActionFactory<
        CategorizationJobData,
        CategorizationWorkerDependencies,
        CategorizationJobData
      >;

      expect(() => {
        createCategorizationPipeline(
          failingActionFactory,
          mockDependencies,
          mockJobData,
          mockContext
        );
      }).toThrow("Action creation failed");

      // Verify error was logged
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CATEGORIZATION_PIPELINE] Error creating pipeline: Error: Action creation failed"
      );
    });

    it("should handle different job data structures", () => {
      const jobDataWithoutMetadata: CategorizationJobData = {
        noteId: "test-note-456",
        importId: "test-import-456",
        jobId: "test-job-456",
      };

      createCategorizationPipeline(
        mockActionFactory,
        mockDependencies,
        jobDataWithoutMetadata,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(4);
    });

    it("should handle different context structures", () => {
      const differentContext: ActionContext = {
        jobId: "different-job-123",
        retryCount: 2,
        queueName: "different-queue",
        operation: "categorization",
        startTime: Date.now() - 1000,
        workerName: "different-worker",
        attemptNumber: 3,
      };

      const pipeline = createCategorizationPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        differentContext
      );

      expect(pipeline).toHaveLength(4);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(4);
    });

    it("should handle dependencies without statusBroadcaster", () => {
      const dependenciesWithoutBroadcaster: CategorizationWorkerDependencies = {
        logger: mockDependencies.logger,
        services: mockDependencies.services,
      };

      const pipeline = createCategorizationPipeline(
        mockActionFactory,
        dependenciesWithoutBroadcaster,
        mockJobData,
        mockContext
      );

      expect(pipeline).toHaveLength(4);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(4);
    });

    it("should log error and rethrow when action creation fails", () => {
      const errorMessage = "Failed to create action";
      const failingActionFactory = {
        ...mockActionFactory,
        create: vi.fn().mockImplementation(() => {
          throw new Error(errorMessage);
        }),
      } as unknown as ActionFactory<
        CategorizationJobData,
        CategorizationWorkerDependencies,
        CategorizationJobData
      >;

      expect(() => {
        createCategorizationPipeline(
          failingActionFactory,
          mockDependencies,
          mockJobData,
          mockContext
        );
      }).toThrow(errorMessage);

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        `[CATEGORIZATION_PIPELINE] Error creating pipeline: Error: ${errorMessage}`
      );
    });

    it("should handle non-Error exceptions", () => {
      const failingActionFactory = {
        ...mockActionFactory,
        create: vi.fn().mockImplementation(() => {
          throw "String error";
        }),
      } as unknown as ActionFactory<
        CategorizationJobData,
        CategorizationWorkerDependencies,
        CategorizationJobData
      >;

      expect(() => {
        createCategorizationPipeline(
          failingActionFactory,
          mockDependencies,
          mockJobData,
          mockContext
        );
      }).toThrow("String error");

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CATEGORIZATION_PIPELINE] Error creating pipeline: String error"
      );
    });
  });
});

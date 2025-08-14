import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { ActionContext } from "../../core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../ingredient/dependencies";
import { createIngredientPipeline } from "../../ingredient/pipeline";

// Helper function to create test data with optional fields for testing
function createTestData(overrides: Partial<IngredientJobData> = {}): IngredientJobData {
  return {
    noteId: "test-note-id",
    ingredientReference: "2 tbsp flour",
    lineIndex: 0,
    parseStatus: "COMPLETED_SUCCESSFULLY" as const,
    isActive: true,
    ...overrides,
  } as IngredientJobData;
}

describe("Ingredient Pipeline", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock factory for testing
  let mockActionFactory: any;
  let mockDependencies: IngredientWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: IngredientJobData;

  beforeEach(() => {
    mockActionFactory = {
      create: vi.fn(),
    };

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      services: {
        parseIngredient: vi.fn(),
        saveIngredient: vi.fn(),
      },
    };

    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
      noteId: "test-note-id",
      ingredientReference: "1 cup flour",
      lineIndex: 0,
      parseStatus: "COMPLETED_SUCCESSFULLY" as const,
      isActive: true,
    };
  });

  describe("createIngredientPipeline", () => {
    it("should create a pipeline with parse and save actions for regular ingredient jobs", () => {
      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(actions).toHaveLength(2);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should create parse ingredient action first for regular ingredient jobs", () => {
      createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        1,
        ActionName.PARSE_INGREDIENT_LINE,
        mockDependencies
      );
    });

    it("should create save ingredient action second for regular ingredient jobs", () => {
      createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        2,
        ActionName.SAVE_INGREDIENT_LINE,
        mockDependencies
      );
    });

    it("should create only completion check action for completion check jobs", () => {
      const completionCheckData = createTestData({
        ingredientReference: undefined as unknown as string,
      });

      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CHECK_INGREDIENT_COMPLETION,
        mockDependencies
      );
    });

    it("should create completion check pipeline when ingredientReference is missing", () => {
      const completionCheckData = createTestData({
        ingredientReference: undefined as unknown as string,
      });

      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CHECK_INGREDIENT_COMPLETION,
        mockDependencies
      );
    });

    it("should create completion check pipeline when ingredientReference is empty string", () => {
      const completionCheckData = createTestData({
        ingredientReference: "",
      });

      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CHECK_INGREDIENT_COMPLETION,
        mockDependencies
      );
    });

    it("should return actions in correct order for regular ingredient jobs", () => {
      const mockParseAction = {
        name: "parse",
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      };
      const mockSaveAction = {
        name: "save",
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      };

      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(actions).toEqual([mockParseAction, mockSaveAction]);
    });

    it("should return completion check action for completion check jobs", () => {
      const mockCompletionAction = {
        name: "completion_check",
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      };

      vi.mocked(mockActionFactory.create).mockReturnValueOnce(
        mockCompletionAction
      );

      const completionCheckData = createTestData({
        ingredientReference: undefined as unknown as string,
      });

      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toEqual([mockCompletionAction]);
    });

    it("should work with different job data for regular ingredient jobs", () => {
      const differentData: IngredientJobData = {
        noteId: "different-note-id",
        ingredientReference: "2 tbsp butter",
        lineIndex: 1,
        importId: "test-import",
        jobId: "test-job",
        metadata: { test: "data" },
        parseStatus: "COMPLETED_SUCCESSFULLY" as const,
        isActive: false,
      };

      createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        differentData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should work with different context", () => {
      const differentContext: ActionContext = {
        jobId: "different-job-id",
        attemptNumber: 2,
        retryCount: 1,
        queueName: "different-queue",
        operation: "different-operation",
        startTime: Date.now(),
        workerName: "different-worker",
      };

      createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        differentContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should work without statusBroadcaster", () => {
      const dependenciesWithoutBroadcaster: IngredientWorkerDependencies = {
        ...mockDependencies,
        statusBroadcaster: undefined,
      };

      createIngredientPipeline(
        mockActionFactory,
        dependenciesWithoutBroadcaster,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should handle action factory errors gracefully", () => {
      vi.mocked(mockActionFactory.create).mockImplementation(() => {
        throw new Error("Action factory error");
      });

      expect(() =>
        createIngredientPipeline(
          mockActionFactory,
          mockDependencies,
          mockData,
          mockContext
        )
      ).toThrow("Action factory error");
    });
  });
});

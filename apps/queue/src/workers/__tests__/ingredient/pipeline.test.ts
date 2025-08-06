import { ParseStatus } from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockLogger,
  createMockStatusBroadcaster,
} from "../../../test-utils/helpers";
import { ActionName } from "../../../types";
import type { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../ingredient/dependencies";
import { createIngredientPipeline } from "../../ingredient/pipeline";

describe("Ingredient Pipeline", () => {
  let mockActionFactory: ActionFactory<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >;
  let mockDependencies: IngredientWorkerDependencies;
  let mockData: IngredientJobData;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock action factory
    mockActionFactory = {
      create: vi.fn(),
    } as unknown as ActionFactory<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >;

    // Create mock dependencies
    mockDependencies = {
      logger: createMockLogger(),
      statusBroadcaster: createMockStatusBroadcaster(),
      services: {
        parseIngredient: vi.fn(),
        saveIngredient: vi.fn(),
      },
    };

    // Create mock job data
    mockData = {
      noteId: "test-note-id",
      ingredientReference: "1 cup flour",
      lineIndex: 0,
      parseStatus: ParseStatus.AWAITING_PARSING,
      isActive: true,
    };

    // Create mock context
    mockContext = {
      jobId: "test-job-id",
      attemptNumber: 1,
      retryCount: 0,
      queueName: "ingredient-queue",
      operation: "ingredient-processing",
      startTime: Date.now(),
      workerName: "ingredient-worker",
    };
  });

  describe("createIngredientPipeline", () => {
    it("should create a pipeline with parse and save actions", () => {
      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(actions).toHaveLength(2);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should create parse ingredient action first", () => {
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

    it("should create save ingredient action second", () => {
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

    it("should return actions in correct order", () => {
      const mockParseAction = { name: "parse", execute: vi.fn() };
      const mockSaveAction = { name: "save", execute: vi.fn() };

      vi.mocked(mockActionFactory.create)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockReturnValueOnce(mockParseAction as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockReturnValueOnce(mockSaveAction as any);

      const actions = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(actions).toEqual([mockParseAction, mockSaveAction]);
    });

    it("should work with different job data", () => {
      const differentData: IngredientJobData = {
        noteId: "different-note-id",
        ingredientReference: "2 tbsp butter",
        lineIndex: 1,
        importId: "test-import",
        jobId: "test-job",
        metadata: { test: "data" },
        parseStatus: ParseStatus.COMPLETED_SUCCESSFULLY,
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

    it("should always create the same pipeline regardless of data", () => {
      const data1: IngredientJobData = {
        noteId: "note-1",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: ParseStatus.AWAITING_PARSING,
        isActive: true,
      };

      const data2: IngredientJobData = {
        noteId: "note-2",
        ingredientReference: "2 tbsp butter",
        lineIndex: 1,
        parseStatus: ParseStatus.COMPLETED_WITH_ERROR,
        isActive: false,
      };

      const actions1 = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        data1,
        mockContext
      );

      const actions2 = createIngredientPipeline(
        mockActionFactory,
        mockDependencies,
        data2,
        mockContext
      );

      expect(actions1).toHaveLength(actions2.length);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(4);
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

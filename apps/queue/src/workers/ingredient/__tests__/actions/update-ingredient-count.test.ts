import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpdateIngredientCountAction } from "../../actions/update-ingredient-count";
import type { UpdateIngredientCountData } from "../../types";
import { IngredientWorkerDependencies } from "../../types";

interface TestContext {
  jobId: string;
  retryCount: number;
  queueName: string;
  noteId: string;
  operation: string;
  startTime: number;
  workerName: string;
  attemptNumber: number;
}

function createDeps(
  overrides: Partial<IngredientWorkerDependencies> = {}
): IngredientWorkerDependencies {
  return {
    database: {
      prisma:
        {} as unknown as IngredientWorkerDependencies["database"]["prisma"],
      patternTracker:
        {} as unknown as IngredientWorkerDependencies["database"]["patternTracker"],
      updateNoteCompletionTracker: vi.fn(),
      incrementNoteCompletionTracker: vi.fn(),
      checkNoteCompletion: vi.fn(),
    } as IngredientWorkerDependencies["database"],
    parseIngredient: vi.fn().mockResolvedValue({
      success: true,
      parseStatus: "CORRECT",
      segments: [],
      processingTime: 100,
    }),
    categorizationQueue: {
      add: vi.fn().mockResolvedValue(undefined),
    } as unknown as IngredientWorkerDependencies["categorizationQueue"],
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    logger: { log: vi.fn() },
    ErrorHandler: {
      withErrorHandling: vi.fn(async (op) => op()),
    },
    ...overrides,
  };
}

function createData(
  overrides: Partial<UpdateIngredientCountData> = {}
): UpdateIngredientCountData {
  return {
    importId: "import-1",
    noteId: "note-1",
    currentIngredientIndex: 3,
    totalIngredients: 5,
    ...overrides,
  };
}

describe("UpdateIngredientCountAction", () => {
  let action: UpdateIngredientCountAction;
  let deps: IngredientWorkerDependencies;
  let data: UpdateIngredientCountData;
  let context: TestContext;

  beforeEach(() => {
    action = new UpdateIngredientCountAction();
    deps = createDeps();
    data = createData();
    context = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test",
      noteId: "note-1",
      operation: "update_ingredient_count",
      startTime: Date.now(),
      workerName: "worker",
      attemptNumber: 1,
    };
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("successfully updates ingredient count for processing state", async () => {
      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify completion tracker was updated
      expect(deps.database.incrementNoteCompletionTracker).toHaveBeenCalledWith(
        "note-1"
      );

      // Verify logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[UPDATE_INGREDIENT_COUNT] Incremented completion tracker for note note-1: ingredient 3/5 completed"
        )
      );

      // Verify status was broadcasted for processing state
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "⏳ 3/5 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 3,
          totalIngredients: 5,
          isComplete: false,
        },
      });
    });

    it("successfully updates ingredient count for completed state", async () => {
      data = createData({
        currentIngredientIndex: 5,
        totalIngredients: 5,
      });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify completion tracker was updated
      expect(deps.database.incrementNoteCompletionTracker).toHaveBeenCalledWith(
        "note-1"
      );

      // Verify logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[UPDATE_INGREDIENT_COUNT] Incremented completion tracker for note note-1: ingredient 5/5 completed"
        )
      );

      // Verify status was broadcasted for completed state
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "COMPLETED",
        message: "✅ 5/5 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 5,
          totalIngredients: 5,
          isComplete: true,
        },
      });
    });

    it("handles missing noteId gracefully", async () => {
      data = createData({ noteId: undefined });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify completion tracker was not called
      expect(
        deps.database.incrementNoteCompletionTracker
      ).not.toHaveBeenCalled();

      // Verify status was still broadcasted
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: undefined,
        status: "PROCESSING",
        message: "⏳ 3/5 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 3,
          totalIngredients: 5,
          isComplete: false,
        },
      });
    });

    it("handles missing incrementNoteCompletionTracker gracefully", async () => {
      deps.database.incrementNoteCompletionTracker =
        undefined as unknown as IngredientWorkerDependencies["database"]["incrementNoteCompletionTracker"];

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify completion tracker was not called
      expect(deps.database.incrementNoteCompletionTracker).toBeUndefined();

      // Verify status was still broadcasted
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "⏳ 3/5 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 3,
          totalIngredients: 5,
          isComplete: false,
        },
      });
    });

    it("handles completion tracker errors gracefully", async () => {
      const error = new Error("Database connection failed");
      deps.database.incrementNoteCompletionTracker = vi
        .fn()
        .mockRejectedValue(error);

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify completion tracker was called
      expect(deps.database.incrementNoteCompletionTracker).toHaveBeenCalledWith(
        "note-1"
      );

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[UPDATE_INGREDIENT_COUNT] Failed to update completion tracker for note note-1: Error: Database connection failed"
        ),
        "error"
      );

      // Verify status was still broadcasted despite error
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "⏳ 3/5 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 3,
          totalIngredients: 5,
          isComplete: false,
        },
      });
    });

    it("handles non-Error exceptions in completion tracker", async () => {
      deps.database.incrementNoteCompletionTracker = vi
        .fn()
        .mockRejectedValue("String error");

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify error logging
      expect(deps.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[UPDATE_INGREDIENT_COUNT] Failed to update completion tracker for note note-1: String error"
        ),
        "error"
      );
    });

    it("handles missing logger gracefully", async () => {
      deps.logger =
        undefined as unknown as IngredientWorkerDependencies["logger"];

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Should not throw when logger is missing
      expect(deps.database.incrementNoteCompletionTracker).toHaveBeenCalled();
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalled();
    });

    it("handles edge case where currentIngredientIndex is 0", async () => {
      data = createData({
        currentIngredientIndex: 0,
        totalIngredients: 5,
      });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify status was broadcasted for processing state (not complete)
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "⏳ 0/5 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 0,
          totalIngredients: 5,
          isComplete: false,
        },
      });
    });

    it("handles edge case where currentIngredientIndex is 1", async () => {
      data = createData({
        currentIngredientIndex: 1,
        totalIngredients: 1,
      });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify status was broadcasted for completed state
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "COMPLETED",
        message: "✅ 1/1 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 1,
          totalIngredients: 1,
          isComplete: true,
        },
      });
    });

    it("handles large ingredient counts", async () => {
      data = createData({
        currentIngredientIndex: 100,
        totalIngredients: 150,
      });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify status was broadcasted for processing state
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-1",
        noteId: "note-1",
        status: "PROCESSING",
        message: "⏳ 100/150 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 100,
          totalIngredients: 150,
          isComplete: false,
        },
      });
    });

    it("handles complex data with all fields", async () => {
      data = createData({
        importId: "import-789",
        noteId: "note-456",
        currentIngredientIndex: 10,
        totalIngredients: 15,
      });

      const result = await action.execute(data, deps, context);

      expect(result).toEqual(data);

      // Verify completion tracker was updated with correct noteId
      expect(deps.database.incrementNoteCompletionTracker).toHaveBeenCalledWith(
        "note-456"
      );

      // Verify status was broadcasted with correct data
      expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING",
        message: "⏳ 10/15 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 10,
          totalIngredients: 15,
          isComplete: false,
        },
      });
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateIngredientCountAction } from "../update-ingredient-count";
import type {
  UpdateIngredientCountData,
  UpdateIngredientCountDeps,
} from "../update-ingredient-count";
import type { ActionContext } from "../../../core/types";

describe("UpdateIngredientCountAction", () => {
  let action: UpdateIngredientCountAction;
  let mockDeps: UpdateIngredientCountDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    action = new UpdateIngredientCountAction();
    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "ingredient-queue",
      operation: "update_ingredient_count",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should broadcast progress status for non-final ingredient", async () => {
      const data: UpdateIngredientCountData = {
        importId: "test-import-123",
        noteId: "test-note-456",
        currentIngredientIndex: 2,
        totalIngredients: 5,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: "test-note-456",
        status: "PROCESSING",
        message: "⏳ 2/5 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 2,
          totalIngredients: 5,
          isComplete: false,
        },
      });
    });

    it("should broadcast completion status for final ingredient", async () => {
      const data: UpdateIngredientCountData = {
        importId: "test-import-123",
        noteId: "test-note-456",
        currentIngredientIndex: 5,
        totalIngredients: 5,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: "test-note-456",
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

    it("should work without noteId", async () => {
      const data: UpdateIngredientCountData = {
        importId: "test-import-123",
        currentIngredientIndex: 1,
        totalIngredients: 3,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: undefined,
        status: "PROCESSING",
        message: "⏳ 1/3 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          currentIngredientIndex: 1,
          totalIngredients: 3,
          isComplete: false,
        },
      });
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ScheduleIngredientsAction } from "../schedule-ingredients";
import type { ScheduleIngredientsDeps } from "../../types";
import type { ScheduleIngredientsData } from "../../schema";
import type { ActionContext } from "../../../core/types";

describe("ScheduleIngredientsAction", () => {
  let action: ScheduleIngredientsAction;
  let mockDeps: ScheduleIngredientsDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new ScheduleIngredientsAction();
    mockDeps = {
      ingredientQueue: {
        add: vi.fn().mockResolvedValue({ id: "ingredient-job-123" }),
      },
      logger: {
        log: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "schedule_ingredients",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should schedule ingredient lines with tracking information", async () => {
      const data: ScheduleIngredientsData = {
        noteId: "test-note-123",
        importId: "test-import-456",
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          parsedIngredientLines: [
            {
              id: "ingredient-1",
              reference: "2 cups flour",
              blockIndex: 0,
              lineIndex: 0,
            },
            {
              id: "ingredient-2",
              reference: "1 cup sugar",
              blockIndex: 0,
              lineIndex: 1,
            },
            {
              id: "ingredient-3",
              reference: "3 eggs",
              blockIndex: 0,
              lineIndex: 2,
            },
          ],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledTimes(3);

      // Check first ingredient job
      expect(mockDeps.ingredientQueue.add).toHaveBeenNthCalledWith(
        1,
        "process_ingredient_line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          ingredientLineId: "ingredient-1",
          reference: "2 cups flour",
          blockIndex: 0,
          lineIndex: 0,
          currentIngredientIndex: 1,
          totalIngredients: 3,
        }
      );

      // Check second ingredient job
      expect(mockDeps.ingredientQueue.add).toHaveBeenNthCalledWith(
        2,
        "process_ingredient_line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          ingredientLineId: "ingredient-2",
          reference: "1 cup sugar",
          blockIndex: 0,
          lineIndex: 1,
          currentIngredientIndex: 2,
          totalIngredients: 3,
        }
      );

      // Check third ingredient job
      expect(mockDeps.ingredientQueue.add).toHaveBeenNthCalledWith(
        3,
        "process_ingredient_line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          ingredientLineId: "ingredient-3",
          reference: "3 eggs",
          blockIndex: 0,
          lineIndex: 2,
          currentIngredientIndex: 3,
          totalIngredients: 3,
        }
      );

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INGREDIENTS] Scheduled 3 ingredient jobs for note test-note-123"
      );
    });

    it("should handle empty ingredient lines", async () => {
      const data: ScheduleIngredientsData = {
        noteId: "test-note-123",
        importId: "test-import-456",
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          parsedIngredientLines: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.ingredientQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INGREDIENTS] Scheduled 0 ingredient jobs for note test-note-123"
      );
    });

    it("should handle undefined ingredient lines", async () => {
      const data = {
        noteId: "test-note-123",
        importId: "test-import-456",
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          parsedIngredientLines: [
            {
              id: "ingredient-1",
              reference: "2 cups flour",
              blockIndex: 0,
              lineIndex: 0,
            },
            undefined, // Simulate undefined ingredient line
            {
              id: "ingredient-3",
              reference: "3 eggs",
              blockIndex: 0,
              lineIndex: 2,
            },
          ],
        },
      } as ScheduleIngredientsData;

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledTimes(2); // Should skip undefined line
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INGREDIENTS] Scheduled 3 ingredient jobs for note test-note-123"
      );
    });
  });
});

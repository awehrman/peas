import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { BaseWorkerDependencies } from "../../../../../workers/types";
import { processIngredients } from "../../../../note/actions/schedule-ingredients/service";

describe("Schedule Ingredients Service", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockQueues: BaseWorkerDependencies["queues"];
  let mockData: NotePipelineData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockQueues = {
      ingredientQueue: {
        add: vi.fn().mockResolvedValue(undefined),
      } as unknown as NonNullable<
        BaseWorkerDependencies["queues"]
      >["ingredientQueue"],
    };

    mockData = {
      noteId: "test-note-id",
      importId: "test-import-id",
      content: "Test Recipe Content",
      file: {
        title: "Test Recipe",
        contents: "Test Recipe Content",
        ingredients: [
          {
            reference: "1 cup flour",
            lineIndex: 0,
            blockIndex: 0,
          },
          {
            reference: "2 eggs",
            lineIndex: 1,
            blockIndex: 0,
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients",
            lineIndex: 2,
          },
        ],
      },
      metadata: {
        sourceUrl: "https://example.com/recipe",
        tags: ["dessert", "baking"],
      },
    };
  });

  describe("processIngredients", () => {
    it("should process ingredients successfully", async () => {
      const result = await processIngredients(mockData, mockLogger, mockQueues);

      expect(result).toBe(mockData);
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenCalledTimes(3); // 2 ingredient jobs + 1 completion check job

      // Check first ingredient job
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenNthCalledWith(
        1,
        ActionName.PARSE_INGREDIENT_LINE,
        {
          noteId: "test-note-id",
          importId: "test-import-id",
          ingredientReference: "1 cup flour",
          lineIndex: 0,
          jobId: "test-note-id-ingredient-0",
          metadata: {
            clearCache: false,
          },
        }
      );

      // Check second ingredient job
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenNthCalledWith(
        2,
        ActionName.PARSE_INGREDIENT_LINE,
        {
          noteId: "test-note-id",
          importId: "test-import-id",
          ingredientReference: "2 eggs",
          lineIndex: 1,
          jobId: "test-note-id-ingredient-1",
          metadata: {
            clearCache: false,
          },
        }
      );

      // Check completion check job
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenNthCalledWith(
        3,
        ActionName.CHECK_INGREDIENT_COMPLETION,
        {
          noteId: "test-note-id",
          importId: "test-import-id",
          jobId: "test-note-id-ingredient-completion-check",
          metadata: {},
        }
      );
    });

    it("should throw error when noteId is missing", async () => {
      const invalidData = { ...mockData, noteId: "" };

      await expect(
        processIngredients(invalidData, mockLogger, mockQueues)
      ).rejects.toThrow("No note ID available for ingredient processing");
    });

    it("should throw error when noteId is undefined", async () => {
      const invalidData = { ...mockData, noteId: undefined };

      await expect(
        processIngredients(invalidData, mockLogger, mockQueues)
      ).rejects.toThrow("No note ID available for ingredient processing");
    });

    it("should return data when no ingredients are found", async () => {
      const dataWithoutIngredients = {
        ...mockData,
        file: {
          ...mockData.file!,
          ingredients: [],
        },
      };

      const result = await processIngredients(
        dataWithoutIngredients,
        mockLogger,
        mockQueues
      );

      expect(result).toBe(dataWithoutIngredients);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INGREDIENTS] No ingredients found for note: test-note-id"
      );
      expect(mockQueues?.ingredientQueue?.add).not.toHaveBeenCalled();
    });

    it("should return data when file.ingredients is undefined", async () => {
      const dataWithoutIngredients = {
        ...mockData,
        file: {
          ...mockData.file!,
          ingredients: undefined,
        },
      } as unknown as NotePipelineData;

      const result = await processIngredients(
        dataWithoutIngredients,
        mockLogger,
        mockQueues
      );

      expect(result).toBe(dataWithoutIngredients);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INGREDIENTS] No ingredients found for note: test-note-id"
      );
      expect(mockQueues?.ingredientQueue?.add).not.toHaveBeenCalled();
    });

    it("should return data when file is undefined", async () => {
      const dataWithoutFile = {
        ...mockData,
        file: undefined,
      };

      const result = await processIngredients(
        dataWithoutFile,
        mockLogger,
        mockQueues
      );

      expect(result).toBe(dataWithoutFile);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INGREDIENTS] No ingredients found for note: test-note-id"
      );
      expect(mockQueues?.ingredientQueue?.add).not.toHaveBeenCalled();
    });

    it("should throw error when ingredient queue is not available", async () => {
      const queuesWithoutIngredientQueue = {
        ...mockQueues,
        ingredientQueue: undefined,
      };

      await expect(
        processIngredients(mockData, mockLogger, queuesWithoutIngredientQueue)
      ).rejects.toThrow("Ingredient queue not available in dependencies");
    });

    it("should throw error when ingredient queue is null", async () => {
      const queuesWithoutIngredientQueue = {
        ...mockQueues,
        ingredientQueue: null,
      } as unknown as BaseWorkerDependencies["queues"];

      await expect(
        processIngredients(mockData, mockLogger, queuesWithoutIngredientQueue)
      ).rejects.toThrow("Ingredient queue not available in dependencies");
    });

    it("should handle queue add errors", async () => {
      const queueError = new Error("Queue add failed");
      mockQueues!.ingredientQueue!.add = vi.fn().mockRejectedValue(queueError);

      await expect(
        processIngredients(mockData, mockLogger, mockQueues)
      ).rejects.toThrow("Queue add failed");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INGREDIENTS] Failed to schedule ingredients: Error: Queue add failed"
      );
    });

    it("should handle multiple ingredients with different line indices", async () => {
      const dataWithMultipleIngredients = {
        ...mockData,
        file: {
          ...mockData.file!,
          ingredients: [
            {
              reference: "1 cup flour",
              lineIndex: 5,
              blockIndex: 0,
            },
            {
              reference: "2 eggs",
              lineIndex: 10,
              blockIndex: 0,
            },
            {
              reference: "1/2 cup sugar",
              lineIndex: 15,
              blockIndex: 0,
            },
          ],
        },
      };

      const result = await processIngredients(
        dataWithMultipleIngredients,
        mockLogger,
        mockQueues
      );

      expect(result).toBe(dataWithMultipleIngredients);
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenCalledTimes(4); // 3 ingredient jobs + 1 completion check job

      // Check job IDs are generated correctly
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenNthCalledWith(
        1,
        ActionName.PARSE_INGREDIENT_LINE,
        expect.objectContaining({
          jobId: "test-note-id-ingredient-5",
        })
      );
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenNthCalledWith(
        2,
        ActionName.PARSE_INGREDIENT_LINE,
        expect.objectContaining({
          jobId: "test-note-id-ingredient-10",
        })
      );
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenNthCalledWith(
        3,
        ActionName.PARSE_INGREDIENT_LINE,
        expect.objectContaining({
          jobId: "test-note-id-ingredient-15",
        })
      );
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenNthCalledWith(
        4,
        ActionName.CHECK_INGREDIENT_COMPLETION,
        expect.objectContaining({
          jobId: "test-note-id-ingredient-completion-check",
        })
      );
    });

    it("should handle ingredients without importId", async () => {
      const dataWithoutImportId = {
        ...mockData,
        importId: undefined,
      };

      const result = await processIngredients(
        dataWithoutImportId,
        mockLogger,
        mockQueues
      );

      expect(result).toBe(dataWithoutImportId);
      expect(mockQueues?.ingredientQueue?.add).toHaveBeenCalledWith(
        ActionName.PARSE_INGREDIENT_LINE,
        expect.objectContaining({
          noteId: "test-note-id",
          importId: undefined,
          ingredientReference: "1 cup flour",
          lineIndex: 0,
          jobId: "test-note-id-ingredient-0",
        })
      );
    });
  });
});

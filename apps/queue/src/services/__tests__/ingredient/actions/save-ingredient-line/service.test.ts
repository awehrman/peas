import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import { saveIngredientLine } from "../../../../ingredient/actions/save-ingredient-line/service";

// Mock the database repository
vi.mock("@peas/database", () => ({
  upsertParsedIngredientLine: vi.fn(),
  replaceParsedSegments: vi.fn(),
  findOrCreateIngredient: vi.fn(),
  createIngredientReference: vi.fn(),
  getIngredientCompletionStatus: vi.fn(),
}));

describe("Save Ingredient Line Service", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  };
  let mockData: IngredientJobData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDatabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      ingredientReference: "1 cup flour",
      lineIndex: 0,
      parseStatus: "COMPLETED_SUCCESSFULLY" as const,
      isActive: true,
      importId: "test-import-id",
    };

    // Get the mocked database functions
    mockDatabase = await import("@peas/database");
  });

  describe("saveIngredientLine", () => {
    it("should throw error when noteId is missing", async () => {
      const invalidData = { ...mockData, noteId: "" };

      await expect(
        saveIngredientLine(invalidData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No note ID available for ingredient saving");
    });

    it("should throw error when ingredientReference is missing", async () => {
      const invalidData = { ...mockData, ingredientReference: "" };

      await expect(
        saveIngredientLine(invalidData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No ingredient reference available for saving");
    });

    it("should save ingredient line without parsed segments", async () => {
      const dataWithoutSegments = {
        ...mockData,
        metadata: {
          rule: "test_rule",
          blockIndex: 5,
        },
      };

      vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDatabase as any).upsertParsedIngredientLine
      ).mockResolvedValue({
        id: "line-123",
      });
      vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDatabase as any).getIngredientCompletionStatus
      ).mockResolvedValue({
        totalIngredients: 5,
        completedIngredients: 3,
      });

      const result = await saveIngredientLine(
        dataWithoutSegments,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDatabase as any).upsertParsedIngredientLine
      ).toHaveBeenCalledWith(
        "test-note-id",
        0,
        "1 cup flour",
        "COMPLETED_SUCCESSFULLY",
        undefined,
        0,
        true
      );
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDatabase as any).replaceParsedSegments
      ).not.toHaveBeenCalled();
      expect(result).toBe(dataWithoutSegments);
    });

    it("should save ingredient line with parsed segments", async () => {
      const dataWithSegments = {
        ...mockData,
        metadata: {
          rule: "ingredient_line",
          blockIndex: 0,
          parsedSegments: [
            {
              index: 0,
              rule: "amount",
              type: "amount",
              value: "1",
              processingTime: 50,
            },
            {
              index: 1,
              rule: "unit",
              type: "unit",
              value: "cup",
              processingTime: 50,
            },
            {
              index: 2,
              rule: "ingredient",
              type: "ingredient",
              value: "flour",
              processingTime: 50,
            },
          ],
        },
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockResolvedValue({
        id: "line-123",
      });
      vi.mocked(mockDatabase.replaceParsedSegments).mockResolvedValue();
      vi.mocked(mockDatabase.findOrCreateIngredient).mockResolvedValue({
        id: "ingredient-456",
        isNew: false,
      });
      vi.mocked(mockDatabase.createIngredientReference).mockResolvedValue();
      vi.mocked(mockDatabase.getIngredientCompletionStatus).mockResolvedValue({
        totalIngredients: 5,
        completedIngredients: 3,
      });

      const result = await saveIngredientLine(
        dataWithSegments,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockDatabase.upsertParsedIngredientLine).toHaveBeenCalledWith(
        "test-note-id",
        0,
        "1 cup flour",
        "COMPLETED_SUCCESSFULLY",
        undefined,
        0,
        true
      );
      expect(mockDatabase.replaceParsedSegments).toHaveBeenCalledWith(
        "line-123",
        dataWithSegments.metadata?.parsedSegments
      );
      expect(mockDatabase.findOrCreateIngredient).toHaveBeenCalledWith("flour");
      expect(mockDatabase.createIngredientReference).toHaveBeenCalledWith(
        "ingredient-456",
        "line-123",
        2,
        "1 cup flour",
        "test-note-id",
        "existing_ingredient"
      );
      expect(result).toBe(dataWithSegments);
    });

    it("should handle new ingredient creation", async () => {
      const dataWithSegments = {
        ...mockData,
        metadata: {
          parsedSegments: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "new_ingredient",
              processingTime: 30,
            },
          ],
        },
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockResolvedValue({
        id: "line-123",
      });
      vi.mocked(mockDatabase.replaceParsedSegments).mockResolvedValue();
      vi.mocked(mockDatabase.findOrCreateIngredient).mockResolvedValue({
        id: "ingredient-789",
        isNew: true,
      });
      vi.mocked(mockDatabase.createIngredientReference).mockResolvedValue();

      const result = await saveIngredientLine(
        dataWithSegments,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockDatabase.findOrCreateIngredient).toHaveBeenCalledWith(
        "new_ingredient"
      );
      expect(mockDatabase.createIngredientReference).toHaveBeenCalledWith(
        "ingredient-789",
        "line-123",
        0,
        "1 cup flour",
        "test-note-id",
        "new_ingredient"
      );
      expect(result).toBe(dataWithSegments);
    });

    it("should handle multiple ingredient segments", async () => {
      const dataWithMultipleIngredients = {
        ...mockData,
        metadata: {
          parsedSegments: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "flour",
              processingTime: 30,
            },
            {
              index: 1,
              rule: "ingredient",
              type: "ingredient",
              value: "sugar",
              processingTime: 30,
            },
            {
              index: 2,
              rule: "unit",
              type: "unit",
              value: "cup",
              processingTime: 30,
            },
          ],
        },
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockResolvedValue({
        id: "line-123",
      });
      vi.mocked(mockDatabase.replaceParsedSegments).mockResolvedValue();
      vi.mocked(mockDatabase.findOrCreateIngredient)
        .mockResolvedValueOnce({ id: "ingredient-1", isNew: false })
        .mockResolvedValueOnce({ id: "ingredient-2", isNew: true });
      vi.mocked(mockDatabase.createIngredientReference).mockResolvedValue();

      const result = await saveIngredientLine(
        dataWithMultipleIngredients,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockDatabase.findOrCreateIngredient).toHaveBeenCalledTimes(2);
      expect(mockDatabase.findOrCreateIngredient).toHaveBeenCalledWith("flour");
      expect(mockDatabase.findOrCreateIngredient).toHaveBeenCalledWith("sugar");
      expect(mockDatabase.createIngredientReference).toHaveBeenCalledTimes(2);
      expect(result).toBe(dataWithMultipleIngredients);
    });

    it("should skip non-ingredient segments", async () => {
      const dataWithNonIngredientSegments = {
        ...mockData,
        metadata: {
          parsedSegments: [
            {
              index: 0,
              rule: "amount",
              type: "amount",
              value: "1",
              processingTime: 30,
            },
            {
              index: 1,
              rule: "unit",
              type: "unit",
              value: "cup",
              processingTime: 30,
            },
            {
              index: 2,
              rule: "modifier",
              type: "modifier",
              value: "sifted",
              processingTime: 30,
            },
          ],
        },
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockResolvedValue({
        id: "line-123",
      });
      vi.mocked(mockDatabase.replaceParsedSegments).mockResolvedValue();

      const result = await saveIngredientLine(
        dataWithNonIngredientSegments,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockDatabase.findOrCreateIngredient).not.toHaveBeenCalled();
      expect(mockDatabase.createIngredientReference).not.toHaveBeenCalled();
      expect(result).toBe(dataWithNonIngredientSegments);
    });

    it("should broadcast completion status when statusBroadcaster is provided", async () => {
      const dataWithSegments = {
        ...mockData,
        metadata: {
          parsedSegments: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "flour",
              processingTime: 30,
            },
          ],
        },
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockResolvedValue({
        id: "line-123",
      });
      vi.mocked(mockDatabase.replaceParsedSegments).mockResolvedValue();
      vi.mocked(mockDatabase.findOrCreateIngredient).mockResolvedValue({
        id: "ingredient-1",
        isNew: false,
      });
      vi.mocked(mockDatabase.createIngredientReference).mockResolvedValue();
      vi.mocked(mockDatabase.getIngredientCompletionStatus).mockResolvedValue({
        totalIngredients: 10,
        completedIngredients: 5,
      });

      const result = await saveIngredientLine(
        dataWithSegments,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockDatabase.getIngredientCompletionStatus).toHaveBeenCalledWith(
        "test-note-id"
      );
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-id",
        noteId: "test-note-id",
        status: "AWAITING_PARSING",
        message: "Processing 5/10 ingredients",
        context: "ingredient_processing",
        currentCount: 5,
        totalCount: 10,
        indentLevel: 1,
        metadata: {
          totalIngredients: 10,
          completedIngredients: 5,
          savedIngredientId: "line-123",
          lineIndex: 0,
        },
      });
      expect(result).toBe(dataWithSegments);
    });

    it("should not broadcast when statusBroadcaster is not provided", async () => {
      const dataWithSegments = {
        ...mockData,
        metadata: {
          parsedSegments: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "flour",
              processingTime: 30,
            },
          ],
        },
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockResolvedValue({
        id: "line-123",
      });
      vi.mocked(mockDatabase.replaceParsedSegments).mockResolvedValue();
      vi.mocked(mockDatabase.findOrCreateIngredient).mockResolvedValue({
        id: "ingredient-1",
        isNew: false,
      });
      vi.mocked(mockDatabase.createIngredientReference).mockResolvedValue();

      const result = await saveIngredientLine(dataWithSegments, mockLogger);

      expect(mockDatabase.getIngredientCompletionStatus).not.toHaveBeenCalled();
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(result).toBe(dataWithSegments);
    });

    it("should handle database errors", async () => {
      const dataWithSegments = {
        ...mockData,
        metadata: {
          parsedSegments: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "flour",
              processingTime: 30,
            },
          ],
        },
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        saveIngredientLine(dataWithSegments, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("Database error");
    });

    it("should handle missing metadata gracefully", async () => {
      const dataWithoutMetadata = {
        ...mockData,
        metadata: undefined,
      };

      vi.mocked(mockDatabase.upsertParsedIngredientLine).mockResolvedValue({
        id: "line-123",
      });

      const result = await saveIngredientLine(
        dataWithoutMetadata,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockDatabase.upsertParsedIngredientLine).toHaveBeenCalledWith(
        "test-note-id",
        0,
        "1 cup flour",
        "COMPLETED_SUCCESSFULLY",
        undefined,
        0,
        true
      );
      expect(mockDatabase.replaceParsedSegments).not.toHaveBeenCalled();
      expect(result).toBe(dataWithoutMetadata);
    });

    it("should have correct function signature", () => {
      expect(typeof saveIngredientLine).toBe("function");
      expect(saveIngredientLine.name).toBe("saveIngredientLine");
    });
  });
});

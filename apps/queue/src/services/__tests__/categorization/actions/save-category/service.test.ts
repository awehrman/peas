import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { CategorizationJobData } from "../../../../categorization/types";

// Mock the database functions
vi.mock("@peas/database", () => ({
  saveCategoryToNote: vi.fn(),
}));

describe("Save Category Service", () => {
  let mockLogger: StructuredLogger;
  let testData: CategorizationJobData;
  let mockSaveCategoryToNote: ReturnType<typeof vi.fn>;
  let saveCategory: (
    data: CategorizationJobData,
    logger: StructuredLogger,
    statusBroadcaster?: {
      addStatusEventAndBroadcast: (
        event: Record<string, unknown>
      ) => Promise<Record<string, unknown>>;
    }
  ) => Promise<CategorizationJobData>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    } as unknown as StructuredLogger;

    testData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      jobId: "test-job-789",
      metadata: {
        determinedCategory: "dessert",
        categorySource: "evernote_tags",
        categoryConfidence: 0.8,
      },
    };

    // Import the mocked function
    const { saveCategoryToNote } = await import("@peas/database");
    mockSaveCategoryToNote = vi.mocked(saveCategoryToNote);

    // Import the function to test
    const { saveCategory: importedFunction } = await import(
      "../../../../categorization/actions/save-category/service"
    );
    saveCategory = importedFunction;
  });

  describe("saveCategory", () => {
    it("should successfully save categories to database", async () => {
      // Arrange
      const mockSavedCategory1 = {
        id: "category-123",
        name: "dessert",
      };
      const mockSavedCategory2 = {
        id: "category-124",
        name: "sweet",
      };
      mockSaveCategoryToNote
        .mockResolvedValueOnce(mockSavedCategory1)
        .mockResolvedValueOnce(mockSavedCategory2);

      const dataWithCategories = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategories: ["dessert", "sweet"],
        },
      };

      // Act
      const result = await saveCategory(dataWithCategories, mockLogger);

      // Assert
      expect(mockSaveCategoryToNote).toHaveBeenCalledWith(
        testData.noteId,
        "dessert"
      );
      expect(mockSaveCategoryToNote).toHaveBeenCalledWith(
        testData.noteId,
        "sweet"
      );
      expect(result.metadata?.categorySaved).toBe(true);
      expect(result.metadata?.savedCategoryIds).toEqual([
        "category-123",
        "category-124",
      ]);
      expect(result.metadata?.savedCategoryNames).toEqual(["dessert", "sweet"]);
      expect(result.metadata?.categoriesCount).toBe(2);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_CATEGORY] Starting category save for note: ${testData.noteId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_CATEGORY] Successfully saved 2 categories for note: ${testData.noteId}`
      );
    });

    it("should handle null category", async () => {
      // Arrange
      const dataWithNullCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: null as unknown as string,
        },
      };

      // Act
      const result = await saveCategory(dataWithNullCategory, mockLogger);

      // Assert
      expect(mockSaveCategoryToNote).not.toHaveBeenCalled();
      expect(result.metadata?.categorySaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_CATEGORY] No categories to save for note: ${testData.noteId}`
      );
    });

    it("should handle undefined category", async () => {
      // Arrange
      const dataWithUndefinedCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: undefined as unknown as string,
        },
      };

      // Act
      const result = await saveCategory(dataWithUndefinedCategory, mockLogger);

      // Assert
      expect(mockSaveCategoryToNote).not.toHaveBeenCalled();
      expect(result.metadata?.categorySaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_CATEGORY] No categories to save for note: ${testData.noteId}`
      );
    });

    it("should handle empty string category", async () => {
      // Arrange
      const dataWithEmptyCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: "",
        },
      };

      // Act
      const result = await saveCategory(dataWithEmptyCategory, mockLogger);

      // Assert
      expect(mockSaveCategoryToNote).not.toHaveBeenCalled();
      expect(result.metadata?.categorySaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_CATEGORY] No categories to save for note: ${testData.noteId}`
      );
    });

    it("should handle database errors", async () => {
      // Arrange
      const dbError = new Error("Database update failed");
      mockSaveCategoryToNote.mockRejectedValue(dbError);

      // Act
      const result = await saveCategory(testData, mockLogger);

      // Assert
      expect(result.metadata?.error).toBe("Database update failed");
      expect(result.metadata?.errorTimestamp).toBeDefined();
    });

    it("should create valid ISO timestamp in savedAt", async () => {
      // Arrange
      const mockSavedCategory = {
        id: "category-123",
        name: "dessert",
      };
      mockSaveCategoryToNote.mockResolvedValue(mockSavedCategory);

      // Act
      const result = await saveCategory(testData, mockLogger);

      // Assert
      const savedAt = new Date(result.metadata!.categorySavedAt as string);
      expect(savedAt.getTime()).not.toBeNaN();
      expect(result.metadata!.categorySavedAt as string).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should handle different category types", async () => {
      // Arrange
      const categories = ["main-course", "dessert", "breakfast"];
      const mockSavedCategory = {
        id: "category-123",
        name: "main-course",
      };
      mockSaveCategoryToNote.mockResolvedValue(mockSavedCategory);

      for (const category of categories) {
        // Clear previous calls
        mockSaveCategoryToNote.mockClear();

        const dataWithCategory = {
          ...testData,
          metadata: {
            ...testData.metadata,
            determinedCategory: category,
          },
        };

        // Act
        const result = await saveCategory(dataWithCategory, mockLogger);

        // Assert
        expect(mockSaveCategoryToNote).toHaveBeenCalledWith(
          testData.noteId,
          category
        );
        expect(result.metadata?.categorySaved).toBe(true);
      }
    });

    it("should handle missing category metadata", async () => {
      // Arrange
      const dataWithoutCategory = {
        ...testData,
        metadata: {
          // No category metadata
        },
      };

      // Act
      const result = await saveCategory(dataWithoutCategory, mockLogger);

      // Assert
      expect(mockSaveCategoryToNote).not.toHaveBeenCalled();
      expect(result.metadata?.categorySaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_CATEGORY] No categories to save for note: ${testData.noteId}`
      );
    });

    it("should handle empty string category", async () => {
      // Arrange
      const dataWithEmptyCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: "",
        },
      };

      // Act
      const result = await saveCategory(dataWithEmptyCategory, mockLogger);

      // Assert
      expect(mockSaveCategoryToNote).not.toHaveBeenCalled();
      expect(result.metadata?.categorySaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_CATEGORY] No categories to save for note: ${testData.noteId}`
      );
    });

    it("should preserve existing metadata", async () => {
      // Arrange
      const dataWithExistingMetadata = {
        ...testData,
        metadata: {
          ...testData.metadata,
          existingKey: "existingValue",
          nestedKey: {
            innerKey: "innerValue",
          },
        },
      };
      const mockSavedCategory = {
        id: "category-123",
        name: "dessert",
      };
      mockSaveCategoryToNote.mockResolvedValue(mockSavedCategory);

      // Act
      const result = await saveCategory(dataWithExistingMetadata, mockLogger);

      // Assert
      expect(result.metadata?.existingKey).toBe("existingValue");
      expect(result.metadata?.nestedKey).toEqual({
        innerKey: "innerValue",
      });
      expect(result.metadata?.categorySaved).toBe(true);
    });

    it("should handle multiple categories with duplicates", async () => {
      // Arrange
      const dataWithDuplicateCategories = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategories: ["dessert", "dessert", "sweet"],
        },
      };
      const mockSavedCategory = {
        id: "category-123",
        name: "dessert",
      };
      mockSaveCategoryToNote.mockResolvedValue(mockSavedCategory);

      // Act
      const result = await saveCategory(
        dataWithDuplicateCategories,
        mockLogger
      );

      // Assert
      expect(mockSaveCategoryToNote).toHaveBeenCalledTimes(3);
      expect(mockSaveCategoryToNote).toHaveBeenCalledWith(
        testData.noteId,
        "dessert"
      );
      expect(mockSaveCategoryToNote).toHaveBeenCalledWith(
        testData.noteId,
        "sweet"
      );
      expect(result.metadata?.categoriesCount).toBe(3);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { CategorizationJobData } from "../../../../categorization/types";

// Mock the database functions
vi.mock("@peas/database", () => ({
  saveTagsToNote: vi.fn(),
}));

describe("Save Tags Service", () => {
  let mockLogger: StructuredLogger;
  let testData: CategorizationJobData;
  let mockSaveTagsToNote: ReturnType<typeof vi.fn>;
  let saveTags: (
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
        determinedTags: ["chocolate", "dessert", "sweet"],
        tagsSource: "evernote_tags",
        tagsConfidence: 0.8,
      },
    };

    // Import the mocked function
    const { saveTagsToNote } = await import("@peas/database");
    mockSaveTagsToNote = vi.mocked(saveTagsToNote);

    // Import the function to test
    const { saveTags: importedFunction } = await import(
      "../../../../categorization/actions/save-tags/service"
    );
    saveTags = importedFunction;
  });

  describe("saveTags", () => {
    it("should successfully save tags to database", async () => {
      // Arrange
      const mockSavedTags = [
        { id: "tag-123", name: "chocolate" },
        { id: "tag-124", name: "dessert" },
        { id: "tag-125", name: "sweet" },
      ];
      mockSaveTagsToNote.mockResolvedValue(mockSavedTags);

      // Act
      const result = await saveTags(testData, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).toHaveBeenCalledWith(testData.noteId, [
        "chocolate",
        "dessert",
        "sweet",
      ]);
      expect(result.metadata?.tagsSaved).toBe(true);
      expect(result.metadata?.savedTagIds).toEqual([
        "tag-123",
        "tag-124",
        "tag-125",
      ]);
      expect(result.metadata?.savedTagNames).toEqual([
        "chocolate",
        "dessert",
        "sweet",
      ]);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_TAGS] Starting tag save for note: ${testData.noteId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_TAGS] Successfully saved 3 tags for note: ${testData.noteId}`
      );
    });

    it("should handle empty tags array", async () => {
      // Arrange
      const dataWithEmptyTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: [],
        },
      };

      // Act
      const result = await saveTags(dataWithEmptyTags, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).not.toHaveBeenCalled();
      expect(result.metadata?.tagsSaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_TAGS] No tags to save for note: ${testData.noteId}`
      );
    });

    it("should handle null tags", async () => {
      // Arrange
      const dataWithNullTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: null,
        },
      };

      // Act
      const result = await saveTags(dataWithNullTags, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).not.toHaveBeenCalled();
      expect(result.metadata?.tagsSaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_TAGS] No tags to save for note: ${testData.noteId}`
      );
    });

    it("should handle undefined tags", async () => {
      // Arrange
      const dataWithUndefinedTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: undefined,
        },
      };

      // Act
      const result = await saveTags(dataWithUndefinedTags, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).not.toHaveBeenCalled();
      expect(result.metadata?.tagsSaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_TAGS] No tags to save for note: ${testData.noteId}`
      );
    });

    it("should handle database errors", async () => {
      // Arrange
      const dbError = new Error("Database update failed");
      mockSaveTagsToNote.mockRejectedValue(dbError);

      // Act
      const result = await saveTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.error).toBe("Database update failed");
      expect(result.metadata?.errorTimestamp).toBeDefined();
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
      const mockSavedTags = [
        { id: "tag-123", name: "chocolate" },
        { id: "tag-124", name: "dessert" },
      ];
      mockSaveTagsToNote.mockResolvedValue(mockSavedTags);

      // Act
      const result = await saveTags(dataWithExistingMetadata, mockLogger);

      // Assert
      expect(result.metadata?.existingKey).toBe("existingValue");
      expect(result.metadata?.nestedKey).toEqual({
        innerKey: "innerValue",
      });
      expect(result.metadata?.tagsSaved).toBe(true);
    });

    it("should create valid ISO timestamp in savedAt", async () => {
      // Arrange
      const mockSavedTags = [
        { id: "tag-123", name: "chocolate" },
        { id: "tag-124", name: "dessert" },
      ];
      mockSaveTagsToNote.mockResolvedValue(mockSavedTags);

      // Act
      const result = await saveTags(testData, mockLogger);

      // Assert
      const savedAt = new Date(result.metadata!.tagsSavedAt as string);
      expect(savedAt.getTime()).not.toBeNaN();
      expect(result.metadata!.tagsSavedAt as string).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should handle tags with special characters", async () => {
      // Arrange
      const dataWithSpecialTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: [
            "gluten-free",
            "dairy-free",
            "vegan-friendly",
            "quick & easy",
          ],
        },
      };
      const mockSavedTags = [
        { id: "tag-123", name: "gluten-free" },
        { id: "tag-124", name: "dairy-free" },
        { id: "tag-125", name: "vegan-friendly" },
        { id: "tag-126", name: "quick & easy" },
      ];
      mockSaveTagsToNote.mockResolvedValue(mockSavedTags);

      // Act
      const result = await saveTags(dataWithSpecialTags, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).toHaveBeenCalledWith(testData.noteId, [
        "gluten-free",
        "dairy-free",
        "vegan-friendly",
        "quick & easy",
      ]);
      expect(result.metadata?.savedTagNames).toEqual([
        "gluten-free",
        "dairy-free",
        "vegan-friendly",
        "quick & easy",
      ]);
    });

    it("should handle missing tags metadata", async () => {
      // Arrange
      const dataWithoutTags = {
        ...testData,
        metadata: {
          // No tags metadata
        },
      };

      // Act
      const result = await saveTags(dataWithoutTags, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).not.toHaveBeenCalled();
      expect(result.metadata?.tagsSaved).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_TAGS] No tags to save for note: ${testData.noteId}`
      );
    });

    it("should handle single tag", async () => {
      // Arrange
      const dataWithSingleTag = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: ["dessert"],
        },
      };
      const mockSavedTags = [{ id: "tag-123", name: "dessert" }];
      mockSaveTagsToNote.mockResolvedValue(mockSavedTags);

      // Act
      const result = await saveTags(dataWithSingleTag, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).toHaveBeenCalledWith(testData.noteId, [
        "dessert",
      ]);
      expect(result.metadata?.savedTagNames).toEqual(["dessert"]);
      expect(result.metadata?.tagsSaved).toBe(true);
    });

    it("should handle very long tag names", async () => {
      // Arrange
      const longTag = "a".repeat(100);
      const dataWithLongTag = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: [longTag, "normal-tag"],
        },
      };
      const mockSavedTags = [
        { id: "tag-123", name: longTag },
        { id: "tag-124", name: "normal-tag" },
      ];
      mockSaveTagsToNote.mockResolvedValue(mockSavedTags);

      // Act
      const result = await saveTags(dataWithLongTag, mockLogger);

      // Assert
      expect(mockSaveTagsToNote).toHaveBeenCalledWith(testData.noteId, [
        longTag,
        "normal-tag",
      ]);
      expect(result.metadata?.savedTagNames).toEqual([longTag, "normal-tag"]);
    });
  });
});

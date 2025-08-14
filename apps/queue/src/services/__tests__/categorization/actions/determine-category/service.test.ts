import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { CategorizationJobData } from "../../../../categorization/types";

// Mock the database functions
vi.mock("@peas/database", () => ({
  getNoteWithEvernoteMetadata: vi.fn(),
}));

// Mock the constants
vi.mock("../../../../../config/constants", () => ({
  CATEGORIZATION_CONSTANTS: {
    NOTEBOOK_CATEGORY_MAPPING: {
      Desserts: ["dessert", "sweet"],
      "Main Dishes": ["main-course", "entree"],
      Breakfast: ["breakfast", "morning"],
    },
  },
}));

describe("Determine Category Service", () => {
  let mockLogger: StructuredLogger;
  let testData: CategorizationJobData;
  let mockGetNoteWithEvernoteMetadata: ReturnType<typeof vi.fn>;
  let determineCategory: (
    data: CategorizationJobData,
    logger: StructuredLogger
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
        testKey: "testValue",
      },
    };

    // Import the mocked function
    const { getNoteWithEvernoteMetadata } = await import("@peas/database");
    mockGetNoteWithEvernoteMetadata = vi.mocked(getNoteWithEvernoteMetadata);

    // Import the function to test
    const { determineCategory: importedFunction } = await import(
      "../../../../categorization/actions/determine-category/service"
    );
    determineCategory = importedFunction;
  });

  describe("determineCategory", () => {
    it("should determine categories from Evernote notebook", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          notebook: "Desserts",
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineCategory(testData, mockLogger);

      // Assert
      expect(mockGetNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        testData.noteId
      );
      expect(result.metadata?.determinedCategories).toEqual([
        "dessert",
        "sweet",
      ]);
      expect(result.metadata?.categoryDeterminedAt).toBeDefined();
      expect(result.metadata?.categoryDeterminationReason).toContain(
        "Based on Evernote notebook: Desserts"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[DETERMINE_CATEGORY] Starting category determination for note: ${testData.noteId}`
      );
    });

    it("should return null when note not found", async () => {
      // Arrange
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(null);

      // Act
      const result = await determineCategory(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedCategory).toBe(null);
      expect(result.metadata?.categoryDeterminationReason).toBe(
        "Note not found"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[DETERMINE_CATEGORY] Note not found: ${testData.noteId}`
      );
    });

    it("should return null when no Evernote metadata", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: null,
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineCategory(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedCategory).toBe(null);
      expect(result.metadata?.categoryDeterminationReason).toBe(
        "No Evernote notebook metadata"
      );
    });

    it("should return null when no notebook in metadata", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          notebook: null,
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineCategory(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedCategory).toBe(null);
      expect(result.metadata?.categoryDeterminationReason).toBe(
        "No Evernote notebook metadata"
      );
    });

    it("should return null when notebook not in mapping", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          notebook: "Unknown Notebook",
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineCategory(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedCategory).toBe(null);
      expect(result.metadata?.categoryDeterminationReason).toContain(
        "No mapping found for notebook"
      );
    });

    it("should handle database errors", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      mockGetNoteWithEvernoteMetadata.mockRejectedValue(dbError);

      // Act
      const result = await determineCategory(testData, mockLogger);

      // Assert
      expect(result.metadata?.error).toBe("Database connection failed");
      expect(result.metadata?.errorTimestamp).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[DETERMINE_CATEGORY] Failed to determine category for note ${testData.noteId}: ${dbError}`
      );
    });

    it("should preserve existing metadata", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          notebook: "Desserts",
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      const dataWithExistingMetadata = {
        ...testData,
        metadata: {
          ...testData.metadata,
          existingKey: "existingValue",
        },
      };

      // Act
      const result = await determineCategory(
        dataWithExistingMetadata,
        mockLogger
      );

      // Assert
      expect(result.metadata?.existingKey).toBe("existingValue");
      expect(result.metadata?.determinedCategories).toEqual([
        "dessert",
        "sweet",
      ]);
    });
  });
});

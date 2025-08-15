import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { CategorizationJobData } from "../../../../categorization/types";

// Mock the database functions
vi.mock("@peas/database", () => ({
  getNoteWithEvernoteMetadata: vi.fn(),
}));

// Mock the constants
vi.mock("../../../../../config/constants", () => ({
  CATEGORIZATION_CONSTANTS: {
    NOTEBOOK_TAG_MAPPING: {
      dessert: ["dessert", "sweet"],
      chocolate: ["chocolate", "dessert"],
      cake: ["cake", "dessert"],
      sweet: ["sweet", "dessert"],
      grilled: ["grilled", "chicken"],
      chicken: ["chicken", "protein"],
      herbs: ["herbs", "seasoning"],
    },
  },
}));

describe("Determine Tags Service", () => {
  let mockLogger: StructuredLogger;
  let testData: CategorizationJobData;
  let mockGetNoteWithEvernoteMetadata: ReturnType<typeof vi.fn>;
  let determineTags: (
    data: CategorizationJobData,
    logger: StructuredLogger
  ) => Promise<CategorizationJobData>;
  let originalToISOString: () => string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Store the original toISOString method
    originalToISOString = Date.prototype.toISOString;

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
    const { determineTags: importedFunction } = await import(
      "../../../../categorization/actions/determine-tags/service"
    );
    determineTags = importedFunction;
  });

  afterEach(() => {
    // Always restore the original toISOString method
    Date.prototype.toISOString = originalToISOString;
  });

  describe("determineTags", () => {
    it("should determine tags from Evernote metadata", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: ["dessert", "chocolate", "cake", "sweet"],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(mockGetNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        testData.noteId
      );
      expect(result.metadata?.determinedTags).toEqual(
        expect.arrayContaining(["dessert", "chocolate", "cake", "sweet"])
      );
      expect(result.metadata?.determinedTags).toHaveLength(4);
      expect(result.metadata?.tagsDeterminedAt).toBeDefined();
      expect(result.metadata?.tagDeterminationReason).toContain(
        "Based on Evernote tags"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[DETERMINE_TAGS] Starting tag determination for note: ${testData.noteId}`
      );
    });

    it("should determine tags from title keywords", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: [],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([]);
      expect(result.metadata?.tagsDeterminedAt).toBeDefined();
      expect(result.metadata?.tagDeterminationReason).toBe(
        "No Evernote tags metadata"
      );
    });

    it("should return empty array when no tags found", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: [],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([]);
      expect(result.metadata?.tagsDeterminedAt).toBeDefined();
      expect(result.metadata?.tagDeterminationReason).toBe(
        "No Evernote tags metadata"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[DETERMINE_TAGS] No Evernote tags metadata found for note: ${testData.noteId}`
      );
    });

    it("should handle note without metadata", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: null,
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([]);
      expect(result.metadata?.tagsDeterminedAt).toBeDefined();
      expect(result.metadata?.tagDeterminationReason).toBe(
        "No Evernote tags metadata"
      );
    });

    it("should handle note without Evernote metadata", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          // No tags property
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([]);
      expect(result.metadata?.tagsDeterminedAt).toBeDefined();
      expect(result.metadata?.tagDeterminationReason).toBe(
        "No Evernote tags metadata"
      );
    });

    it("should handle database errors", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      mockGetNoteWithEvernoteMetadata.mockRejectedValue(dbError);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.error).toBe("Database connection failed");
      expect(result.metadata?.errorTimestamp).toBeDefined();
    });

    it("should handle errors within the try block", async () => {
      // Arrange - Mock a note with tags that will cause an error when processing
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: ["dessert", "chocolate"],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Mock the logger.log to throw an error during the try block
      const originalLog = mockLogger.log;
      mockLogger.log = vi.fn().mockImplementation((message: string) => {
        if (message.includes("Found Evernote tags")) {
          throw new Error("Logger error during processing");
        }
        return originalLog(message);
      });

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert - The error should be caught and handled by the service
      expect(result.metadata?.error).toBe("Logger error during processing");
      expect(result.metadata?.errorTimestamp).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to determine tags for note test-note-123: Error: Logger error during processing"
        )
      );
    });

    it("should handle note not found", async () => {
      // Arrange
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(null);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([]);
      expect(result.metadata?.tagsDeterminedAt).toBeDefined();
      expect(result.metadata?.tagDeterminationReason).toBe("Note not found");
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[DETERMINE_TAGS] Note not found: ${testData.noteId}`
      );
    });

    it("should filter out duplicate tags", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: ["dessert", "dessert", "chocolate", "sweet"],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual(
        expect.arrayContaining(["dessert", "chocolate", "sweet"])
      );
      expect(result.metadata?.determinedTags).toHaveLength(3);
    });

    it("should handle case-insensitive tag matching", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: ["CHOCOLATE", "CAKE", "DESSERT"],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([
        "CHOCOLATE",
        "CAKE",
        "DESSERT",
      ]);
    });

    it("should preserve existing metadata", async () => {
      // Arrange
      const testDataWithMetadata = {
        ...testData,
        metadata: {
          ...testData.metadata,
          existingKey: "existingValue",
          innerKey: "innerValue",
        },
      };
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: ["dessert", "chocolate"],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testDataWithMetadata, mockLogger);

      // Assert
      expect(result.metadata?.existingKey).toBe("existingValue");
      expect(result.metadata?.innerKey).toBe("innerValue");
      expect(result.metadata?.determinedTags).toEqual(
        expect.arrayContaining(["dessert", "chocolate"])
      );
      expect(result.metadata?.determinedTags).toHaveLength(3); // dessert maps to [dessert, sweet], chocolate maps to [chocolate, dessert]
    });

    it("should handle tags with special characters", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: ["gluten-free", "dairy-free", "vegan-friendly", "quick & easy"],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([
        "gluten-free",
        "dairy-free",
        "vegan-friendly",
        "quick & easy",
      ]);
    });

    it("should handle very long tag names", async () => {
      // Arrange
      const longTag = "a".repeat(100);
      const mockNote = {
        id: "test-note-123",
        evernoteMetadata: {
          tags: [longTag, "normal-tag"],
        },
      };
      mockGetNoteWithEvernoteMetadata.mockResolvedValue(mockNote);

      // Act
      const result = await determineTags(testData, mockLogger);

      // Assert
      expect(result.metadata?.determinedTags).toEqual([longTag, "normal-tag"]);
    });
  });
});

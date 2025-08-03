/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  findNotesWithSimilarTitles,
  getNoteWithIngredients,
  markNoteAsDuplicate,
  updateNoteTitleSimHash,
} from "@peas/database";
import type { NoteStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import {
  calculateIngredientSimilarity,
  calculateSimilarityScore,
  generateTitleSimHash,
} from "../../../../../utils/simhash";
import { checkForDuplicates } from "../../../../note/actions/check-duplicates/service";

// Mock dependencies before imports
vi.mock("@peas/database", () => ({
  findNotesWithSimilarTitles: vi.fn(),
  getNoteWithIngredients: vi.fn(),
  markNoteAsDuplicate: vi.fn(),
  updateNoteTitleSimHash: vi.fn(),
}));

vi.mock("../../../../../utils/simhash", () => ({
  calculateIngredientSimilarity: vi.fn(),
  calculateSimilarityScore: vi.fn(),
  generateTitleSimHash: vi.fn(),
}));

// Type the mocked functions
const mockFindNotesWithSimilarTitles = vi.mocked(findNotesWithSimilarTitles);
const mockGetNoteWithIngredients = vi.mocked(getNoteWithIngredients);
const mockMarkNoteAsDuplicate = vi.mocked(markNoteAsDuplicate);
const mockUpdateNoteTitleSimHash = vi.mocked(updateNoteTitleSimHash);
const mockCalculateIngredientSimilarity = vi.mocked(
  calculateIngredientSimilarity
);
const mockCalculateSimilarityScore = vi.mocked(calculateSimilarityScore);
const mockGenerateTitleSimHash = vi.mocked(generateTitleSimHash);

describe("checkForDuplicates", () => {
  let mockLogger: StructuredLogger;
  let mockNoteData: NotePipelineData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockNoteData = {
      noteId: "test-note-id",
      content: "test content",
      source: {
        url: "https://example.com",
      },
    };
  });

  describe("successful duplicate detection", () => {
    it("should mark note as duplicate when high confidence match is found", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [
          {
            id: "1",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
          {
            id: "2",
            reference: "sugar",
            blockIndex: 0,
            lineIndex: 1,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNoteWithIngredients = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        parsedIngredientLines: [
          {
            id: "3",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
          {
            id: "4",
            reference: "sugar",
            blockIndex: 0,
            lineIndex: 1,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "2", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients);

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.95); // High title similarity
      mockCalculateIngredientSimilarity.mockReturnValue(0.9); // High ingredient similarity

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockGetNoteWithIngredients).toHaveBeenCalledWith("test-note-id");
      expect(mockGenerateTitleSimHash).toHaveBeenCalledWith(
        "Chocolate Chip Cookies"
      );
      expect(mockUpdateNoteTitleSimHash).toHaveBeenCalledWith(
        "test-note-id",
        "new-simhash"
      );
      expect(mockFindNotesWithSimilarTitles).toHaveBeenCalledWith(
        "new-simhash",
        3,
        "test-note-id"
      );
      expect(mockMarkNoteAsDuplicate).toHaveBeenCalledWith("test-note-id", {
        existingNotes: [
          { id: "similar-note-id", title: "Chocolate Chip Cookies Recipe" },
        ],
        duplicateReason:
          "High-confidence duplicate detected (94.0% match): Title similarity: 95.0%, Ingredient similarity: 90.0%",
        confidence: 0.94, // 0.95 * 0.7 + 0.9 * 0.3
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Starting duplicate check for note: test-note-id"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Updated SimHash for note test-note-id: new-simhash"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] High-confidence duplicate detected for note: test-note-id. Confidence: 0.94"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Note test-note-id marked as DUPLICATE with 94% confidence"
      );
    });

    it("should not update SimHash if it hasn't changed", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "existing-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue("existing-simhash");
      mockFindNotesWithSimilarTitles.mockResolvedValue([]);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockUpdateNoteTitleSimHash).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });

    it("should handle multiple similar notes and use highest confidence match", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [
          {
            id: "1",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote1 = {
        id: "similar-note-1",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash-1",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNote2 = {
        id: "similar-note-2",
        title: "Best Chocolate Chip Cookies",
        titleSimHash: "similar-simhash-2",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNoteWithIngredients1 = {
        id: "similar-note-1",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash-1",
        parsedIngredientLines: [
          {
            id: "3",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "2", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNoteWithIngredients2 = {
        id: "similar-note-2",
        title: "Best Chocolate Chip Cookies",
        titleSimHash: "similar-simhash-2",
        parsedIngredientLines: [
          {
            id: "4",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "3", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients1)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients2);

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([
        mockSimilarNote1,
        mockSimilarNote2,
      ]);

      // First note has higher confidence
      mockCalculateSimilarityScore
        .mockReturnValueOnce(0.95) // First note title similarity
        .mockReturnValueOnce(0.85); // Second note title similarity

      mockCalculateIngredientSimilarity
        .mockReturnValueOnce(0.9) // First note ingredient similarity
        .mockReturnValueOnce(0.8); // Second note ingredient similarity

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockMarkNoteAsDuplicate).toHaveBeenCalledWith("test-note-id", {
        existingNotes: [
          { id: "similar-note-1", title: "Chocolate Chip Cookies Recipe" },
          { id: "similar-note-2", title: "Best Chocolate Chip Cookies" },
        ],
        duplicateReason:
          "High-confidence duplicate detected (94.0% match): Title similarity: 95.0%, Ingredient similarity: 90.0%",
        confidence: 0.94, // Uses the highest confidence (first note)
      });
    });
  });

  describe("low confidence matches", () => {
    it("should not mark note as duplicate when confidence is below 90%", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [
          {
            id: "1",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNoteWithIngredients = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        parsedIngredientLines: [
          {
            id: "3",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "2", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients);

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.8); // Lower title similarity
      mockCalculateIngredientSimilarity.mockReturnValue(0.7); // Lower ingredient similarity

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Potential duplicates found but confidence too low (77% < 90%). Keeping note as non-duplicate."
      );
    });

    it("should handle notes with no ingredients", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNoteWithIngredients = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [
          { id: "2", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients);

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.95);
      mockCalculateIngredientSimilarity.mockReturnValue(0.0); // No ingredients

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      // With 95% title similarity and 0% ingredient similarity (no ingredients),
      // confidence = 0.95 * 0.7 + 0.0 * 0.3 = 0.665, which is below 90% threshold
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Potential duplicates found but confidence too low (66% < 90%). Keeping note as non-duplicate."
      );
    });
  });

  describe("edge cases and error handling", () => {
    it("should throw error when noteId is missing", async () => {
      // Arrange
      const noteDataWithoutId = { ...mockNoteData, noteId: undefined };

      // Act & Assert
      await expect(
        checkForDuplicates(noteDataWithoutId, mockLogger)
      ).rejects.toThrow("Note ID is required for duplicate checking");
    });

    it("should throw error when note is not found", async () => {
      // Arrange
      mockGetNoteWithIngredients.mockResolvedValue(null);

      // Act & Assert
      await expect(
        checkForDuplicates(mockNoteData, mockLogger)
      ).rejects.toThrow("Note with ID test-note-id not found");
    });

    it("should skip duplicate check when note has no title", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: null,
        titleSimHash: null,
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockGenerateTitleSimHash).not.toHaveBeenCalled();
      expect(mockFindNotesWithSimilarTitles).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Note test-note-id has no title, skipping duplicate check"
      );
    });

    it("should handle empty title string", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "",
        titleSimHash: null,
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Note test-note-id has no title, skipping duplicate check"
      );
    });

    it("should handle whitespace-only title", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "   ",
        titleSimHash: null,
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue(""); // Whitespace-only title generates empty SimHash
      mockFindNotesWithSimilarTitles.mockResolvedValue([]);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      mockGetNoteWithIngredients.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        checkForDuplicates(mockNoteData, mockLogger)
      ).rejects.toThrow("Database connection failed");
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Failed to check for duplicates: Error: Database connection failed"
      );
    });

    it("should handle similar notes without titleSimHash", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: null, // Missing SimHash
        status: "ACTIVE" as NoteStatus,
      };

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockCalculateSimilarityScore).not.toHaveBeenCalled();
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });

    it("should handle similar notes without title", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: null, // Missing title
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockCalculateSimilarityScore).not.toHaveBeenCalled();
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });

    it("should handle case where similar note with ingredients is not found", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [
          {
            id: "1",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(null); // Similar note not found

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.95);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      // When similar note is not found, ingredientSimilarity is set to 0.0
      // without calling calculateIngredientSimilarity
      expect(mockCalculateIngredientSimilarity).not.toHaveBeenCalled();
    });

    it("should filter out empty ingredient references", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [
          {
            id: "1",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
          {
            id: "2",
            reference: "",
            blockIndex: 0,
            lineIndex: 1,
            ingredientReferences: [],
          },
          {
            id: "3",
            reference: "   ",
            blockIndex: 0,
            lineIndex: 2,
            ingredientReferences: [],
          },
          {
            id: "4",
            reference: "sugar",
            blockIndex: 0,
            lineIndex: 3,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNoteWithIngredients = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        parsedIngredientLines: [
          {
            id: "5",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
          {
            id: "6",
            reference: "sugar",
            blockIndex: 0,
            lineIndex: 1,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "2", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients);

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.95);
      mockCalculateIngredientSimilarity.mockReturnValue(0.9);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockCalculateIngredientSimilarity).toHaveBeenCalledWith(
        ["flour", "sugar"], // Only non-empty ingredients
        ["flour", "sugar"]
      );
    });

    it("should handle confidence calculation with zero ingredient similarity", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [
          {
            id: "1",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNoteWithIngredients = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        parsedIngredientLines: [
          {
            id: "3",
            reference: "butter",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "2", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients);

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.95);
      mockCalculateIngredientSimilarity.mockReturnValue(0.0); // No ingredient overlap

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      // With 95% title similarity and 0% ingredient similarity,
      // confidence = 0.95 * 0.7 + 0.0 * 0.3 = 0.665, which is below 90% threshold
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Potential duplicates found but confidence too low (66% < 90%). Keeping note as non-duplicate."
      );
    });
  });

  describe("no duplicates found", () => {
    it("should return data unchanged when no similar notes found", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([]);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });

    it("should return data unchanged when no matches meet confidence threshold", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.3); // Low similarity
      mockCalculateIngredientSimilarity.mockReturnValue(0.2); // Low similarity

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });
  });

  describe("SimHash generation edge cases", () => {
    it("should handle case where SimHash generation returns empty string", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue(""); // SimHash generation returns empty string

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockFindNotesWithSimilarTitles).not.toHaveBeenCalled();
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });

    it("should handle case where SimHash generation returns empty string", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue(""); // SimHash generation returns empty string

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockFindNotesWithSimilarTitles).not.toHaveBeenCalled();
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });
  });

  describe("findDuplicateMatches internal edge cases", () => {
    it("should handle case where note has no title in findDuplicateMatches", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: null, // This will trigger the early return in findDuplicateMatches
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockGenerateTitleSimHash).not.toHaveBeenCalled();
      expect(mockFindNotesWithSimilarTitles).not.toHaveBeenCalled();
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] Note test-note-id has no title, skipping duplicate check"
      );
    });

    it("should handle case where matches array is empty but confidence calculation uses optional chaining", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      } as any;

      mockGetNoteWithIngredients.mockResolvedValue(mockCurrentNote);
      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([]); // No similar notes

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockMarkNoteAsDuplicate).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CHECK_DUPLICATES] No duplicates found for note: test-note-id"
      );
    });

    it("should handle case where matches array has elements but first match has no matchReason", async () => {
      // Arrange
      const mockCurrentNote = {
        id: "test-note-id",
        title: "Chocolate Chip Cookies",
        titleSimHash: "old-simhash",
        parsedIngredientLines: [
          {
            id: "1",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "1", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      const mockSimilarNote = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        status: "ACTIVE" as NoteStatus,
      };

      const mockSimilarNoteWithIngredients = {
        id: "similar-note-id",
        title: "Chocolate Chip Cookies Recipe",
        titleSimHash: "similar-simhash",
        parsedIngredientLines: [
          {
            id: "3",
            reference: "flour",
            blockIndex: 0,
            lineIndex: 0,
            ingredientReferences: [],
          },
        ],
        parsedInstructionLines: [
          { id: "2", originalText: "Mix ingredients", lineIndex: 0 },
        ],
      } as any;

      mockGetNoteWithIngredients
        .mockResolvedValueOnce(mockCurrentNote)
        .mockResolvedValueOnce(mockSimilarNoteWithIngredients);

      mockGenerateTitleSimHash.mockReturnValue("new-simhash");
      mockUpdateNoteTitleSimHash.mockResolvedValue();
      mockFindNotesWithSimilarTitles.mockResolvedValue([mockSimilarNote]);
      mockCalculateSimilarityScore.mockReturnValue(0.95);
      mockCalculateIngredientSimilarity.mockReturnValue(0.9);

      // Act
      const result = await checkForDuplicates(mockNoteData, mockLogger);

      // Assert
      expect(result).toEqual(mockNoteData);
      expect(mockMarkNoteAsDuplicate).toHaveBeenCalledWith("test-note-id", {
        existingNotes: [
          { id: "similar-note-id", title: "Chocolate Chip Cookies Recipe" },
        ],
        duplicateReason:
          "High-confidence duplicate detected (94.0% match): Title similarity: 95.0%, Ingredient similarity: 90.0%",
        confidence: 0.94,
      });
    });
  });
});

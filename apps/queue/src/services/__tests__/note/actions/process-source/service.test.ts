/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { processSource } from "../../../../note/actions/process-source/service";

// Mock the database
vi.mock("@peas/database", () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    evernoteMetadata: {
      update: vi.fn(),
    },
  },
}));

// Mock the helpers
vi.mock("../../../../note/actions/process-source/helpers", () => ({
  createOrFindSourceWithUrl: vi.fn(),
  createOrFindSourceWithBook: vi.fn(),
  isValidUrl: vi.fn(),
}));

describe("processSource", () => {
  let mockData: NotePipelineData;
  let mockLogger: StructuredLogger;
  let mockPrisma: any;
  let mockCreateOrFindSourceWithUrl: ReturnType<typeof vi.fn>;
  let mockCreateOrFindSourceWithBook: ReturnType<typeof vi.fn>;
  let mockIsValidUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock data
    mockData = {
      content: "<html><body><h1>Test Recipe</h1></body></html>",
      jobId: "test-job-123",
      noteId: "test-note-456",
      importId: "test-import-789",
      metadata: { source: "test" },
      file: {
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
        ingredients: [
          { reference: "Ingredient 1", blockIndex: 0, lineIndex: 0 },
          { reference: "Ingredient 2", blockIndex: 0, lineIndex: 1 },
        ],
        instructions: [
          { reference: "Step 1", lineIndex: 0 },
          { reference: "Step 2", lineIndex: 1 },
        ],
        source: "https://example.com/recipe",
      },
    };

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Get mocked database
    const dbModule = await import("@peas/database");
    mockPrisma = dbModule.prisma;

    // Get mocked helpers
    const helpersModule = await import(
      "../../../../note/actions/process-source/helpers"
    );
    mockCreateOrFindSourceWithUrl = vi.mocked(
      helpersModule.createOrFindSourceWithUrl
    );
    mockCreateOrFindSourceWithBook = vi.mocked(
      helpersModule.createOrFindSourceWithBook
    );
    mockIsValidUrl = vi.mocked(helpersModule.isValidUrl);

    // Setup default mock implementations
    mockPrisma.note.findUnique.mockResolvedValue({
      id: "test-note-456",
      evernoteMetadataId: "evernote-metadata-123",
      evernoteMetadata: {
        id: "evernote-metadata-123",
      },
    });
    mockPrisma.evernoteMetadata.update.mockResolvedValue({});
    mockPrisma.note.update.mockResolvedValue({});
    mockIsValidUrl.mockReturnValue(true);
    mockCreateOrFindSourceWithUrl.mockResolvedValue("source-id-123");
  });

  describe("basic functionality", () => {
    it("should process source URL and return data", async () => {
      const result = await processSource(mockData, mockLogger);

      expect(result).toBe(mockData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Starting source processing for note: ${mockData.noteId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Processing source URL: ${mockData.file?.source} for note: ${mockData.noteId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Successfully processed source for note: ${mockData.noteId}, source ID: source-id-123`
      );
    });

    it("should find note with evernote metadata", async () => {
      await processSource(mockData, mockLogger);

      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: mockData.noteId },
        include: {
          evernoteMetadata: true,
        },
      });
    });

    it("should process URL source", async () => {
      await processSource(mockData, mockLogger);

      expect(mockIsValidUrl).toHaveBeenCalledWith(mockData.file?.source);
      expect(mockCreateOrFindSourceWithUrl).toHaveBeenCalledWith(
        mockData.file?.source,
        mockLogger
      );
    });

    it("should process book reference", async () => {
      mockIsValidUrl.mockReturnValue(false);
      mockCreateOrFindSourceWithBook.mockResolvedValue("book-source-id-456");

      await processSource(mockData, mockLogger);

      expect(mockCreateOrFindSourceWithBook).toHaveBeenCalledWith(
        mockData.file?.source,
        mockLogger
      );
    });

    it("should update evernote metadata with source", async () => {
      await processSource(mockData, mockLogger);

      expect(mockPrisma.evernoteMetadata.update).toHaveBeenCalledWith({
        where: { id: "evernote-metadata-123" },
        data: { source: mockData.file?.source },
      });
    });

    it("should connect note to source", async () => {
      await processSource(mockData, mockLogger);

      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: mockData.noteId },
        data: {
          sources: {
            connect: { id: "source-id-123" },
          },
        },
      });
    });
  });

  describe("noteId validation", () => {
    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: undefined,
      };

      await expect(
        processSource(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });

    it("should throw error when noteId is null", async () => {
      const dataWithNullNoteId = {
        ...mockData,
        noteId: null as unknown as string,
      };

      await expect(
        processSource(dataWithNullNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });

    it("should throw error when noteId is empty string", async () => {
      const dataWithEmptyNoteId = {
        ...mockData,
        noteId: "",
      };

      await expect(
        processSource(dataWithEmptyNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });

    it("should work with valid noteId", async () => {
      const result = await processSource(mockData, mockLogger);

      expect(result).toBe(mockData);
    });
  });

  describe("note lookup", () => {
    it("should throw error when note is not found", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        `Note with ID ${mockData.noteId} not found`
      );
    });

    it("should handle note without evernote metadata", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({
        id: "test-note-456",
        evernoteMetadataId: null,
        evernoteMetadata: null,
      });

      const result = await processSource(mockData, mockLogger);

      expect(result).toBe(mockData);
    });
  });

  describe("source URL handling", () => {
    it("should return data when no source URL is found", async () => {
      const dataWithoutSource = {
        ...mockData,
        file: {
          ...mockData.file!,
          source: undefined,
        },
      };

      const result = await processSource(dataWithoutSource, mockLogger);

      expect(result).toBe(dataWithoutSource);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] No source URL found for note: ${mockData.noteId}`
      );
    });

    it("should return data when file is missing", async () => {
      const dataWithoutFile = {
        ...mockData,
        file: undefined,
      };

      const result = await processSource(dataWithoutFile, mockLogger);

      expect(result).toBe(dataWithoutFile);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] No source URL found for note: ${mockData.noteId}`
      );
    });

    it("should handle empty source URL", async () => {
      const dataWithEmptySource = {
        ...mockData,
        file: {
          ...mockData.file!,
          source: "",
        },
      };

      const result = await processSource(dataWithEmptySource, mockLogger);

      expect(result).toBe(dataWithEmptySource);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] No source URL found for note: ${mockData.noteId}`
      );
    });

    it("should handle whitespace source URL", async () => {
      const dataWithWhitespaceSource = {
        ...mockData,
        file: {
          ...mockData.file!,
          source: "   ",
        },
      };

      const result = await processSource(dataWithWhitespaceSource, mockLogger);

      expect(result).toBe(dataWithWhitespaceSource);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Processing source URL:     for note: ${mockData.noteId}`
      );
    });
  });

  describe("URL vs book processing", () => {
    it("should process valid URL", async () => {
      mockIsValidUrl.mockReturnValue(true);
      mockCreateOrFindSourceWithUrl.mockResolvedValue("url-source-id");

      await processSource(mockData, mockLogger);

      expect(mockIsValidUrl).toHaveBeenCalledWith(mockData.file?.source);
      expect(mockCreateOrFindSourceWithUrl).toHaveBeenCalledWith(
        mockData.file?.source,
        mockLogger
      );
      expect(mockCreateOrFindSourceWithBook).not.toHaveBeenCalled();
    });

    it("should process book reference", async () => {
      mockIsValidUrl.mockReturnValue(false);
      mockCreateOrFindSourceWithBook.mockResolvedValue("book-source-id");

      await processSource(mockData, mockLogger);

      expect(mockIsValidUrl).toHaveBeenCalledWith(mockData.file?.source);
      expect(mockCreateOrFindSourceWithBook).toHaveBeenCalledWith(
        mockData.file?.source,
        mockLogger
      );
      expect(mockCreateOrFindSourceWithUrl).not.toHaveBeenCalled();
    });

    it("should handle different URL formats", async () => {
      const dataWithHttpsUrl = {
        ...mockData,
        file: {
          ...mockData.file!,
          source: "https://example.com/recipe",
        },
      };
      mockIsValidUrl.mockReturnValue(true);
      mockCreateOrFindSourceWithUrl.mockResolvedValue("https-source-id");

      await processSource(dataWithHttpsUrl, mockLogger);

      expect(mockCreateOrFindSourceWithUrl).toHaveBeenCalledWith(
        "https://example.com/recipe",
        mockLogger
      );
    });

    it("should handle different book references", async () => {
      const dataWithBookReference = {
        ...mockData,
        file: {
          ...mockData.file!,
          source: "The Joy of Cooking",
        },
      };
      mockIsValidUrl.mockReturnValue(false);
      mockCreateOrFindSourceWithBook.mockResolvedValue("book-source-id");

      await processSource(dataWithBookReference, mockLogger);

      expect(mockCreateOrFindSourceWithBook).toHaveBeenCalledWith(
        "The Joy of Cooking",
        mockLogger
      );
    });
  });

  describe("logging", () => {
    it("should log start message with correct noteId", async () => {
      await processSource(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Starting source processing for note: ${mockData.noteId}`
      );
    });

    it("should log source URL processing", async () => {
      await processSource(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Processing source URL: ${mockData.file?.source} for note: ${mockData.noteId}`
      );
    });

    it("should log completion message with source ID", async () => {
      await processSource(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Successfully processed source for note: ${mockData.noteId}, source ID: source-id-123`
      );
    });

    it("should log error message when processing fails", async () => {
      const processingError = new Error("Processing failed");
      mockPrisma.note.findUnique.mockRejectedValue(processingError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Processing failed"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[PROCESS_SOURCE] Failed to process source: Error: Processing failed`
      );
    });
  });

  describe("error handling", () => {
    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.note.findUnique.mockRejectedValue(dbError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle source creation errors", async () => {
      const sourceError = new Error("Source creation failed");
      mockCreateOrFindSourceWithUrl.mockRejectedValue(sourceError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Source creation failed"
      );
    });

    it("should handle metadata update errors", async () => {
      const metadataError = new Error("Metadata update failed");
      mockPrisma.evernoteMetadata.update.mockRejectedValue(metadataError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Metadata update failed"
      );
    });

    it("should handle note update errors", async () => {
      const noteUpdateError = new Error("Note update failed");
      mockPrisma.note.update.mockRejectedValue(noteUpdateError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Note update failed"
      );
    });

    it("should handle non-Error exceptions", async () => {
      mockPrisma.note.findUnique.mockRejectedValue("String error");

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "String error"
      );
    });
  });

  describe("data preservation", () => {
    it("should preserve all original data properties", async () => {
      const complexData = {
        ...mockData,
        source: {
          filename: "test.html",
          url: "https://example.com/test.html",
        },
        options: {
          parseIngredients: true,
          parseInstructions: true,
        },
        note: {
          id: "existing-note",
          title: "Existing Note",
          content: "existing content",
          html: "existing html",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await processSource(complexData, mockLogger);

      expect(result).toBe(complexData);
      expect(result.jobId).toBe(complexData.jobId);
      expect(result.noteId).toBe(complexData.noteId);
      expect(result.importId).toBe(complexData.importId);
      expect(result.metadata).toEqual(complexData.metadata);
      expect(result.source).toEqual(complexData.source);
      expect(result.options).toEqual(complexData.options);
      expect(result.file).toEqual(complexData.file);
    });

    it("should return the same data object reference", async () => {
      const result = await processSource(mockData, mockLogger);

      expect(result).toBe(mockData);
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined data", async () => {
      await expect(processSource(null as any, mockLogger)).rejects.toThrow();
    });

    it("should handle null or undefined logger", async () => {
      await expect(processSource(mockData, null as any)).rejects.toThrow();
    });

    it("should handle logger without log method", async () => {
      const invalidLogger = {} as StructuredLogger;

      await expect(processSource(mockData, invalidLogger)).rejects.toThrow();
    });

    it("should handle data with minimal required fields", async () => {
      const minimalData = {
        noteId: "minimal-note-id",
      } as unknown as NotePipelineData;

      // Mock the database to return null for this note
      mockPrisma.note.findUnique.mockResolvedValue(null);

      await expect(processSource(minimalData, mockLogger)).rejects.toThrow(
        "Note with ID minimal-note-id not found"
      );
    });

    it("should handle data with different noteId values", async () => {
      const dataWithDifferentNoteId = {
        ...mockData,
        noteId: "different-note-id",
      };

      const result = await processSource(dataWithDifferentNoteId, mockLogger);

      expect(result).toBe(dataWithDifferentNoteId);
    });
  });

  describe("performance characteristics", () => {
    it("should handle large data efficiently", async () => {
      const startTime = Date.now();
      const largeContent = "x".repeat(1000000);
      const dataWithLargeContent = {
        ...mockData,
        content: largeContent,
        file: {
          ...mockData.file!,
          contents: largeContent,
        },
      };

      const result = await processSource(dataWithLargeContent, mockLogger);
      const endTime = Date.now();

      expect(result).toBe(dataWithLargeContent);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle many ingredients and instructions", async () => {
      const manyIngredients = Array.from({ length: 1000 }, (_, i) => ({
        reference: `Ingredient ${i}`,
        blockIndex: Math.floor(i / 10),
        lineIndex: i % 10,
      }));
      const manyInstructions = Array.from({ length: 500 }, (_, i) => ({
        reference: `Step ${i}`,
        lineIndex: i,
      }));

      const dataWithManyItems = {
        ...mockData,
        file: {
          ...mockData.file!,
          ingredients: manyIngredients,
          instructions: manyInstructions,
        },
      };

      const result = await processSource(dataWithManyItems, mockLogger);

      expect(result).toBe(dataWithManyItems);
      expect(result.file?.ingredients).toHaveLength(1000);
      expect(result.file?.instructions).toHaveLength(500);
    });
  });
});

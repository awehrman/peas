/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { saveNote } from "../../../../note/actions/save-note/service";

// Mock the database module
vi.mock("@peas/database", () => ({
  createNote: vi.fn(),
  createNoteWithEvernoteMetadata: vi.fn(),
}));

describe("saveNote", () => {
  let mockData: NotePipelineData;
  let mockLogger: StructuredLogger;
  let mockCreateNote: ReturnType<typeof vi.fn>;
  let mockCreateNoteWithEvernoteMetadata: ReturnType<typeof vi.fn>;

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
        image: "recipe-image.jpg",
        evernoteMetadata: {
          source: "https://example.com/recipe",
          originalCreatedAt: new Date("2023-01-01"),
          tags: ["recipe", "cooking"],
        },
      },
    };

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Get mocked database functions
    const dbModule = await import("@peas/database");
    mockCreateNote = vi.mocked(dbModule.createNote);
    mockCreateNoteWithEvernoteMetadata = vi.mocked(
      dbModule.createNoteWithEvernoteMetadata
    );

    // Setup default mock implementations
    const mockNoteResult = {
      id: "new-note-789",
      title: "Test Recipe",
      evernoteMetadataId: "evernote-metadata-123",
      parsedIngredientLines: [
        { id: "ing-1", reference: "Ingredient 1", blockIndex: 0, lineIndex: 0 },
        { id: "ing-2", reference: "Ingredient 2", blockIndex: 0, lineIndex: 1 },
      ],
      parsedInstructionLines: [
        { id: "inst-1", reference: "Step 1", lineIndex: 0 },
        { id: "inst-2", reference: "Step 2", lineIndex: 1 },
      ],
      createdAt: new Date("2023-01-01T10:00:00Z"),
      updatedAt: new Date("2023-01-01T10:00:00Z"),
    };

    mockCreateNote.mockResolvedValue(mockNoteResult);
    mockCreateNoteWithEvernoteMetadata.mockResolvedValue(mockNoteResult);
  });

  describe("basic functionality", () => {
    it("should save note and return updated data", async () => {
      const result = await saveNote(mockData, mockLogger);

      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        mockData.file!
      );
      expect(result).toEqual({
        ...mockData,
        noteId: "new-note-789",
        note: {
          id: "new-note-789",
          title: "Test Recipe",
          content: mockData.file!.contents,
          html: mockData.file!.contents,
          createdAt: new Date("2023-01-01T10:00:00Z"),
          updatedAt: new Date("2023-01-01T10:00:00Z"),
          parsedIngredientLines: [
            {
              id: "ing-1",
              reference: "Ingredient 1",
              blockIndex: 0,
              lineIndex: 0,
            },
            {
              id: "ing-2",
              reference: "Ingredient 2",
              blockIndex: 0,
              lineIndex: 1,
            },
          ],
          parsedInstructionLines: [
            { id: "inst-1", reference: "Step 1", lineIndex: 0 },
            { id: "inst-2", reference: "Step 2", lineIndex: 1 },
          ],
        },
      });
    });

    it("should log start and completion messages", async () => {
      await saveNote(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Starting note creation"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[SAVE_NOTE] Successfully created note with ID: new-note-789, title: "Test Recipe", evernoteMetadataId: evernote-metadata-123'
      );
    });

    it("should call createNote with correct parameters", async () => {
      await saveNote(mockData, mockLogger);

      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        mockData.file!
      );
    });
  });

  describe("file validation", () => {
    it("should throw error when file is missing", async () => {
      const dataWithoutFile = {
        ...mockData,
        file: undefined,
      };

      await expect(saveNote(dataWithoutFile, mockLogger)).rejects.toThrow(
        "No parsed HTML file data available for note creation"
      );
    });

    it("should throw error when file is null", async () => {
      const dataWithNullFile = {
        ...mockData,
        file: null,
      };

      await expect(
        saveNote(dataWithNullFile as any, mockLogger)
      ).rejects.toThrow("No parsed HTML file data available for note creation");
    });
  });

  describe("database result handling", () => {
    it("should handle database result with all fields", async () => {
      const dbResult = {
        id: "complete-note-123",
        title: "Complete Recipe",
        parsedIngredientLines: [
          {
            id: "ing-1",
            reference: "Complete Ingredient 1",
            blockIndex: 1,
            lineIndex: 5,
          },
        ],
        parsedInstructionLines: [
          { id: "inst-1", reference: "Complete Step 1", lineIndex: 5 },
        ],
        createdAt: new Date("2023-01-01T12:00:00Z"),
        updatedAt: new Date("2023-01-01T12:00:00Z"),
      };
      mockCreateNoteWithEvernoteMetadata.mockResolvedValue(dbResult);

      const result = await saveNote(mockData, mockLogger);

      expect(result.noteId).toBe("complete-note-123");
      expect(result.note).toEqual({
        id: "complete-note-123",
        title: "Complete Recipe",
        content: mockData.file!.contents,
        html: mockData.file!.contents,
        createdAt: new Date("2023-01-01T12:00:00Z"),
        updatedAt: new Date("2023-01-01T12:00:00Z"),
        parsedIngredientLines: [
          {
            id: "ing-1",
            reference: "Complete Ingredient 1",
            blockIndex: 1,
            lineIndex: 5,
          },
        ],
        parsedInstructionLines: [
          { id: "inst-1", reference: "Complete Step 1", lineIndex: 5 },
        ],
      });
    });

    it("should handle database result without createdAt and updatedAt", async () => {
      const dbResult = {
        id: "note-without-dates",
        title: "Recipe Without Dates",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      };
      mockCreateNoteWithEvernoteMetadata.mockResolvedValue(dbResult);

      const result = await saveNote(mockData, mockLogger);

      expect(result.note?.createdAt).toBeInstanceOf(Date);
      expect(result.note?.updatedAt).toBeInstanceOf(Date);
    });

    it("should handle database result with empty arrays", async () => {
      const dbResult = {
        id: "empty-note",
        title: "Empty Recipe",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
        createdAt: new Date("2023-01-01T10:00:00Z"),
        updatedAt: new Date("2023-01-01T10:00:00Z"),
      };
      mockCreateNoteWithEvernoteMetadata.mockResolvedValue(dbResult);

      const result = await saveNote(mockData, mockLogger);

      expect(result.note?.parsedIngredientLines).toEqual([]);
      expect(result.note?.parsedInstructionLines).toEqual([]);
    });

    it("should handle database result with undefined arrays", async () => {
      const dbResult = {
        id: "undefined-arrays-note",
        title: "Recipe With Undefined Arrays",
        parsedIngredientLines: undefined,
        parsedInstructionLines: undefined,
        createdAt: new Date("2023-01-01T10:00:00Z"),
        updatedAt: new Date("2023-01-01T10:00:00Z"),
      };
      mockCreateNoteWithEvernoteMetadata.mockResolvedValue(dbResult);

      const result = await saveNote(mockData, mockLogger);

      expect(result.note?.parsedIngredientLines).toBeUndefined();
      expect(result.note?.parsedInstructionLines).toBeUndefined();
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

      const result = await saveNote(complexData, mockLogger);

      expect(result.jobId).toBe(complexData.jobId);
      expect(result.noteId).toBe("new-note-789"); // Updated with database result
      expect(result.importId).toBe(complexData.importId);
      expect(result.metadata).toEqual(complexData.metadata);
      expect(result.source).toEqual(complexData.source);
      expect(result.options).toEqual(complexData.options);
      expect(result.file).toEqual(complexData.file);
    });

    it("should use original content in note", async () => {
      const result = await saveNote(mockData, mockLogger);

      expect(result.note?.content).toBe(mockData.file!.contents);
      expect(result.note?.html).toBe(mockData.file!.contents);
    });

    it("should update noteId with database result", async () => {
      const result = await saveNote(mockData, mockLogger);

      expect(result.noteId).toBe("new-note-789");
    });
  });

  describe("logging", () => {
    it("should log correct completion message", async () => {
      const dbResult = {
        id: "custom-note-id",
        title: "Custom Recipe Title",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreateNoteWithEvernoteMetadata.mockResolvedValue(dbResult);

      await saveNote(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[SAVE_NOTE] Successfully created note with ID: custom-note-id, title: "Custom Recipe Title", evernoteMetadataId: none'
      );
    });

    it("should log error message when database operation fails", async () => {
      const dbError = new Error("Database connection failed");
      mockCreateNoteWithEvernoteMetadata.mockRejectedValue(dbError);

      await expect(saveNote(mockData, mockLogger)).rejects.toThrow(
        "Database connection failed"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Failed to create note: Error: Database connection failed"
      );
    });
  });

  describe("error handling", () => {
    it("should handle database errors", async () => {
      const dbError = new Error("Database error");
      mockCreateNoteWithEvernoteMetadata.mockRejectedValue(dbError);

      await expect(saveNote(mockData, mockLogger)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle database errors with custom messages", async () => {
      const dbError = new Error("Unique constraint violation");
      mockCreateNoteWithEvernoteMetadata.mockRejectedValue(dbError);

      await expect(saveNote(mockData, mockLogger)).rejects.toThrow(
        "Unique constraint violation"
      );
    });

    it("should handle non-Error exceptions from database", async () => {
      mockCreateNoteWithEvernoteMetadata.mockRejectedValue("String error");

      await expect(saveNote(mockData, mockLogger)).rejects.toThrow(
        "String error"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined data", async () => {
      await expect(saveNote(null as any, mockLogger)).rejects.toThrow();
    });

    it("should handle null or undefined logger", async () => {
      await expect(saveNote(mockData, null as any)).rejects.toThrow();
    });

    it("should handle logger without log method", async () => {
      const invalidLogger = {} as StructuredLogger;

      await expect(saveNote(mockData, invalidLogger)).rejects.toThrow();
    });

    it("should handle data without content property", async () => {
      const dataWithoutContent = {
        jobId: "test-job-123",
        noteId: "test-note-456",
        importId: "test-import-789",
        metadata: { source: "test" },
      } as unknown as NotePipelineData;

      await expect(saveNote(dataWithoutContent, mockLogger)).rejects.toThrow();
    });

    it("should handle file with minimal required fields", async () => {
      const minimalFileData = {
        ...mockData,
        file: {
          title: "Minimal Recipe",
          contents: "<html><body>Minimal content</body></html>",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await saveNote(minimalFileData, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(result.note?.content).toBe(
        "<html><body>Minimal content</body></html>"
      );
    });

    it("should handle file with complete evernoteMetadata", async () => {
      const fileWithEvernoteMetadata = {
        ...mockData,
        file: {
          ...mockData.file!,
          evernoteMetadata: {
            source: "https://evernote.com/recipe",
            tags: ["recipe", "cooking", "dinner"],
            originalCreatedAt: new Date("2023-01-01"),
          },
        },
      };

      const result = await saveNote(fileWithEvernoteMetadata, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        fileWithEvernoteMetadata.file
      );
    });

    it("should handle file with only source in evernoteMetadata", async () => {
      const fileWithSourceOnly = {
        ...mockData,
        file: {
          ...mockData.file!,
          evernoteMetadata: {
            source: "https://evernote.com/recipe",
          },
        },
      };

      const result = await saveNote(fileWithSourceOnly, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        fileWithSourceOnly.file
      );
    });

    it("should handle file with only tags in evernoteMetadata", async () => {
      const fileWithTagsOnly = {
        ...mockData,
        file: {
          ...mockData.file!,
          evernoteMetadata: {
            tags: ["recipe", "cooking"],
          },
        },
      };

      const result = await saveNote(fileWithTagsOnly, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        fileWithTagsOnly.file
      );
    });

    it("should handle file with only originalCreatedAt in evernoteMetadata", async () => {
      const fileWithDateOnly = {
        ...mockData,
        file: {
          ...mockData.file!,
          evernoteMetadata: {
            originalCreatedAt: new Date("2023-01-01"),
          },
        },
      };

      const result = await saveNote(fileWithDateOnly, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        fileWithDateOnly.file
      );
    });

    it("should handle file with empty evernoteMetadata", async () => {
      const fileWithEmptyMetadata = {
        ...mockData,
        file: {
          ...mockData.file!,
          evernoteMetadata: {},
        },
      };

      const result = await saveNote(fileWithEmptyMetadata, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        fileWithEmptyMetadata.file
      );
    });

    it("should handle file with undefined evernoteMetadata values", async () => {
      const fileWithUndefinedValues = {
        ...mockData,
        file: {
          ...mockData.file!,
          evernoteMetadata: {
            source: undefined,
            tags: undefined,
            originalCreatedAt: undefined,
          },
        },
      };

      const result = await saveNote(fileWithUndefinedValues, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        fileWithUndefinedValues.file
      );
    });

    it("should handle file with undefined evernoteMetadata", async () => {
      const fileWithoutMetadata = {
        ...mockData,
        file: {
          ...mockData.file!,
          evernoteMetadata: undefined,
        },
      };

      const result = await saveNote(fileWithoutMetadata, mockLogger);

      expect(result.note?.title).toBe("Test Recipe");
      expect(mockCreateNoteWithEvernoteMetadata).toHaveBeenCalledWith(
        fileWithoutMetadata.file
      );
    });
  });

  describe("performance characteristics", () => {
    it("should handle large file data efficiently", async () => {
      const startTime = Date.now();
      const largeContent = "x".repeat(1000000);
      const dataWithLargeFile = {
        ...mockData,
        file: {
          ...mockData.file,
          contents: largeContent,
        },
      };

      const result = await saveNote(dataWithLargeFile as any, mockLogger);
      const endTime = Date.now();

      expect(result.note?.content).toBe(largeContent);
      expect(result.note?.html).toBe(largeContent);
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
          ...mockData.file,
          ingredients: manyIngredients,
          instructions: manyInstructions,
        },
      };

      const dbResult = {
        id: "many-items-note",
        title: "Recipe With Many Items",
        parsedIngredientLines: manyIngredients.map((ing, i) => ({
          id: `ing-${i}`,
          ...ing,
        })),
        parsedInstructionLines: manyInstructions.map((inst, i) => ({
          id: `inst-${i}`,
          ...inst,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreateNoteWithEvernoteMetadata.mockResolvedValue(dbResult);

      const result = await saveNote(dataWithManyItems as any, mockLogger);

      expect(result.note?.parsedIngredientLines).toHaveLength(1000);
      expect(result.note?.parsedInstructionLines).toHaveLength(500);
    });
  });
});

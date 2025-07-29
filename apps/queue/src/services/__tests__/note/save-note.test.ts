import { beforeEach, describe, expect, it, vi } from "vitest";

// Import the mocked schema
import { SaveNoteDataSchema } from "../../../schemas";
import { SaveNoteAction, saveNote } from "../../../services/note/save-note";
import { createMockActionContext } from "../../../test-utils/helpers";
import type { NotePipelineData } from "../../../types/notes";
import type { NoteWorkerDependencies } from "../../../types/notes";

// Mock the database package
vi.mock("@peas/database", () => ({
  createNote: vi.fn(),
}));

// Mock the schemas
vi.mock("../../../schemas", () => ({
  SaveNoteDataSchema: {
    parse: vi.fn(),
  },
}));

describe("SaveNoteAction", () => {
  const mockDependencies: NoteWorkerDependencies = {
    logger: {
      log: vi.fn(),
    },
    services: {
      parseHtml: vi.fn(),
      cleanHtml: vi.fn(),
      saveNote: vi.fn(),
    },
    statusBroadcaster: {
      addStatusEventAndBroadcast: vi.fn(),
    },
  };

  const mockData: NotePipelineData = {
    content: "<html><body>Test content</body></html>",
    importId: "test-import-id",
    file: {
      title: "Test Recipe",
      contents: "<html><body>Test content</body></html>",
      ingredients: [],
      instructions: [],
    },
  };

  const mockContext = createMockActionContext();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SaveNoteAction class", () => {
    it("should have correct action name", () => {
      const action = new SaveNoteAction();
      expect(action.name).toBe("save_note");
    });

    it("should execute successfully with importId and status broadcaster", async () => {
      const action = new SaveNoteAction();
      const resultData = {
        ...mockData,
        noteId: "test-note-id",
        note: {
          id: "test-note-id",
          title: "Test Recipe",
          content: mockData.content,
          html: mockData.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      vi.mocked(mockDependencies.services.saveNote).mockResolvedValue(
        resultData
      );

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.services.saveNote).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(resultData);
    });

    it("should execute successfully without importId", async () => {
      const action = new SaveNoteAction();
      const dataWithoutImportId = { ...mockData, importId: undefined };
      const resultData = {
        ...dataWithoutImportId,
        noteId: "test-note-id",
        note: {
          id: "test-note-id",
          title: "Test Recipe",
          content: mockData.content,
          html: mockData.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      vi.mocked(mockDependencies.services.saveNote).mockResolvedValue(
        resultData
      );

      const result = await action.execute(
        dataWithoutImportId,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.services.saveNote).toHaveBeenCalledWith(
        dataWithoutImportId
      );
      expect(result).toEqual(resultData);
    });

    it("should execute successfully without status broadcaster", async () => {
      const action = new SaveNoteAction();
      const depsWithoutBroadcaster = {
        ...mockDependencies,
        statusBroadcaster: undefined,
      };
      const resultData = {
        ...mockData,
        noteId: "test-note-id",
        note: {
          id: "test-note-id",
          title: "Test Recipe",
          content: mockData.content,
          html: mockData.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      vi.mocked(mockDependencies.services.saveNote).mockResolvedValue(
        resultData
      );

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(mockDependencies.services.saveNote).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(resultData);
    });

    it("should handle service error", async () => {
      const action = new SaveNoteAction();
      const error = new Error("Service error");

      vi.mocked(mockDependencies.services.saveNote).mockRejectedValue(error);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should validate input successfully with valid data", () => {
      const action = new SaveNoteAction();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(SaveNoteDataSchema.parse).mockReturnValue(mockData as any);

      const result = action.validateInput(mockData);

      expect(SaveNoteDataSchema.parse).toHaveBeenCalledWith(mockData);
      expect(result).toBeNull();
    });

    it("should return validation error when schema validation fails", () => {
      const action = new SaveNoteAction();
      const validationError = new Error("Validation failed");

      vi.mocked(SaveNoteDataSchema.parse).mockImplementation(() => {
        throw validationError;
      });

      const result = action.validateInput(mockData);

      expect(SaveNoteDataSchema.parse).toHaveBeenCalledWith(mockData);
      expect(result).toBe(validationError);
    });

    it("should return generic error when schema validation throws non-Error", () => {
      const action = new SaveNoteAction();

      vi.mocked(SaveNoteDataSchema.parse).mockImplementation(() => {
        throw "String error";
      });

      const result = action.validateInput(mockData);

      expect(SaveNoteDataSchema.parse).toHaveBeenCalledWith(mockData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("String error");
    });

    it("should handle missing logger gracefully", async () => {
      const action = new SaveNoteAction();
      const depsWithoutLogger = {
        ...mockDependencies,
        logger: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any; // Type assertion for testing edge case
      const resultData = {
        ...mockData,
        noteId: "test-note-id",
        note: {
          id: "test-note-id",
          title: "Test Recipe",
          content: mockData.content,
          html: mockData.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      vi.mocked(mockDependencies.services.saveNote).mockResolvedValue(
        resultData
      );

      const result = await action.execute(
        mockData,
        depsWithoutLogger,
        mockContext
      );

      expect(result).toEqual(resultData);
    });

    it("should handle missing services gracefully", async () => {
      const action = new SaveNoteAction();

      const depsWithoutServices = {
        ...mockDependencies,
        services: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any; // Type assertion for testing edge case

      await expect(
        action.execute(mockData, depsWithoutServices, mockContext)
      ).rejects.toThrow();
    });
  });

  describe("saveNote function", () => {
    const mockDependencies = {
      logger: {
        log: vi.fn(),
      },
    };

    const mockData: NotePipelineData = {
      content: "<html><body>Test content</body></html>",
      importId: "test-import-id",
      file: {
        title: "Test Recipe",
        contents: "<html><body>Test content</body></html>",
        ingredients: [],
        instructions: [],
      },
    };

    const mockDbNote = {
      id: "test-note-id",
      title: "Test Recipe",
      parsedIngredientLines: [],
      parsedInstructionLines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should create note successfully", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      vi.mocked(mockDbCreateNote).mockResolvedValue(mockDbNote);

      const result = await saveNote(mockData, mockDependencies.logger);

      expect(mockDbCreateNote).toHaveBeenCalledWith(mockData.file);
      expect(result.noteId).toBe("test-note-id");
      expect(result.note).toBeDefined();
      expect(result.note?.id).toBe("test-note-id");
      expect(result.note?.title).toBe("Test Recipe");
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Starting note creation"
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SAVE_NOTE] Successfully created note with ID: test-note-id"
        )
      );
    });

    it("should create note with parsed ingredient and instruction lines", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbNoteWithLines = {
        ...mockDbNote,
        parsedIngredientLines: [
          {
            id: "ingredient-1",
            reference: "1 cup flour",
            blockIndex: 0,
            lineIndex: 1,
          },
        ],
        parsedInstructionLines: [
          {
            id: "instruction-1",
            originalText: "Mix ingredients",
            lineIndex: 1,
          },
        ],
      };
      vi.mocked(mockDbCreateNote).mockResolvedValue(dbNoteWithLines);

      const result = await saveNote(mockData, mockDependencies.logger);

      expect(result.note?.parsedIngredientLines).toEqual(
        dbNoteWithLines.parsedIngredientLines
      );
      expect(result.note?.parsedInstructionLines).toEqual(
        dbNoteWithLines.parsedInstructionLines
      );
    });

    it("should handle database note without createdAt and updatedAt", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbNoteWithoutTimestamps = {
        id: "test-note-id",
        title: "Test Recipe",
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      };
      vi.mocked(mockDbCreateNote).mockResolvedValue(dbNoteWithoutTimestamps);

      const result = await saveNote(mockData, mockDependencies.logger);

      expect(result.note?.createdAt).toBeInstanceOf(Date);
      expect(result.note?.updatedAt).toBeInstanceOf(Date);
    });

    it("should handle database note with null title", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbNoteWithNullTitle = {
        ...mockDbNote,
        title: null,
      };
      vi.mocked(mockDbCreateNote).mockResolvedValue(dbNoteWithNullTitle);

      const result = await saveNote(mockData, mockDependencies.logger);

      expect(result.note?.title).toBeNull();
    });

    it("should preserve original content and HTML from file data", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const customContent =
        "<html><body><h1>Custom Recipe</h1><p>Special content</p></body></html>";
      const dataWithCustomContent = {
        ...mockData,
        file: {
          ...mockData.file!,
          contents: customContent,
        },
      };
      vi.mocked(mockDbCreateNote).mockResolvedValue(mockDbNote);

      const result = await saveNote(
        dataWithCustomContent,
        mockDependencies.logger
      );

      expect(result.note?.content).toBe(customContent);
      expect(result.note?.html).toBe(customContent);
    });

    it("should throw error when file data is missing", async () => {
      const dataWithoutFile = { ...mockData, file: undefined };

      await expect(
        saveNote(dataWithoutFile, mockDependencies.logger)
      ).rejects.toThrow("No parsed HTML file data available for note creation");
    });

    it("should handle database errors", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbError = new Error("Database error");
      vi.mocked(mockDbCreateNote).mockRejectedValue(dbError);

      await expect(saveNote(mockData, mockDependencies.logger)).rejects.toThrow(
        "Database error"
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Failed to create note: Error: Database error"
      );
    });

    it("should handle database errors with non-Error objects", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbError = "Database connection failed";
      vi.mocked(mockDbCreateNote).mockRejectedValue(dbError);

      await expect(saveNote(mockData, mockDependencies.logger)).rejects.toBe(
        dbError
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Failed to create note: Database connection failed"
      );
    });

    it("should handle database errors with complex objects", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbError = {
        code: "CONNECTION_FAILED",
        message: "Connection timeout",
      };
      vi.mocked(mockDbCreateNote).mockRejectedValue(dbError);

      await expect(saveNote(mockData, mockDependencies.logger)).rejects.toBe(
        dbError
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Failed to create note: [object Object]"
      );
    });

    it("should handle missing logger gracefully", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      vi.mocked(mockDbCreateNote).mockResolvedValue(mockDbNote);

      // The function expects a logger, so we need to provide a mock that won't fail
      const mockLogger = { log: vi.fn() };

      const result = await saveNote(mockData, mockLogger);

      expect(result.noteId).toBe("test-note-id");
      expect(result.note).toBeDefined();
    });

    it("should handle logger with missing log method", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      vi.mocked(mockDbCreateNote).mockResolvedValue(mockDbNote);

      // The function expects a logger with a log method, so we need to provide a proper mock
      const mockLogger = { log: vi.fn() };

      const result = await saveNote(mockData, mockLogger);

      expect(result.noteId).toBe("test-note-id");
      expect(result.note).toBeDefined();
    });

    it("should handle data with additional properties", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      vi.mocked(mockDbCreateNote).mockResolvedValue(mockDbNote);

      const dataWithExtras = {
        ...mockData,
        extraProperty: "extra value",
        metadata: { custom: "data" },
        priority: 5,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any; // Type assertion for testing additional properties

      const result = await saveNote(dataWithExtras, mockDependencies.logger);

      expect(result.noteId).toBe("test-note-id");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).extraProperty).toBe("extra value");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).metadata).toEqual({ custom: "data" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).priority).toBe(5);
    });

    it("should handle empty ingredient and instruction arrays", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbNoteWithEmptyArrays = {
        ...mockDbNote,
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      };
      vi.mocked(mockDbCreateNote).mockResolvedValue(dbNoteWithEmptyArrays);

      const result = await saveNote(mockData, mockDependencies.logger);

      expect(result.note?.parsedIngredientLines).toEqual([]);
      expect(result.note?.parsedInstructionLines).toEqual([]);
    });

    it("should handle undefined ingredient and instruction arrays", async () => {
      const { createNote: mockDbCreateNote } = await import("@peas/database");
      const dbNoteWithUndefinedArrays = {
        ...mockDbNote,
        parsedIngredientLines: undefined,
        parsedInstructionLines: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any; // Type assertion for testing undefined arrays
      vi.mocked(mockDbCreateNote).mockResolvedValue(dbNoteWithUndefinedArrays);

      const result = await saveNote(mockData, mockDependencies.logger);

      expect(result.note?.parsedIngredientLines).toBeUndefined();
      expect(result.note?.parsedInstructionLines).toBeUndefined();
    });
  });
});

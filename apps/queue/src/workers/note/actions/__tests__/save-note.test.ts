import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SaveNoteAction } from "../save-note";
import type { SaveNoteDeps, NoteWithParsedLines } from "../../types";
import type { ActionContext } from "../../../core/types";
import type { ParsedHtmlFile } from "../../types";

describe("SaveNoteAction", () => {
  let action: SaveNoteAction;
  let mockDeps: SaveNoteDeps;
  let mockContext: ActionContext;
  let mockParsedFile: ParsedHtmlFile;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new SaveNoteAction();
    mockDeps = {
      createNote: vi.fn(),
      logger: {
        log: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "save_note",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
    mockParsedFile = {
      title: "Test Recipe",
      contents: "Test content",
      ingredients: [
        {
          reference: "2 cups flour",
          blockIndex: 0,
          lineIndex: 0,
        },
      ],
      instructions: [
        {
          reference: "Mix ingredients",
          lineIndex: 0,
        },
      ],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should create action with correct name", () => {
      expect(action.name).toBe("save_note");
    });

    it("should have validation schema", () => {
      expect(action.schema).toBeDefined();
    });
  });

  describe("Validation", () => {
    it("should validate valid data", () => {
      const validData = {
        file: mockParsedFile,
      };

      const result = action.schema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject missing file", () => {
      const invalidData = {};

      const result = action.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain("expected object");
      }
    });

    it("should reject invalid file structure", () => {
      const invalidData = {
        file: {
          title: "", // Empty title should fail validation
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = action.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain("Title is required");
      }
    });
  });

  describe("run", () => {
    it("should successfully save note and return data with note", async () => {
      const inputData = {
        file: mockParsedFile,
      };

      const mockNote: NoteWithParsedLines = {
        id: "note-123",
        title: "Test Recipe",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [
          {
            id: "ingredient-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        parsedInstructionLines: [
          {
            id: "instruction-1",
            originalText: "Mix ingredients",
            lineIndex: 0,
          },
        ],
      };

      vi.mocked(mockDeps.createNote).mockResolvedValue(mockNote);

      const result = await action.run(inputData, mockDeps, mockContext);

      expect(mockDeps.createNote).toHaveBeenCalledWith(inputData.file);
      expect(result).toEqual({
        ...inputData,
        note: mockNote,
      });
    });

    it("should log start and success messages", async () => {
      const inputData = {
        file: mockParsedFile,
      };

      const mockNote: NoteWithParsedLines = {
        id: "note-123",
        title: "Test Recipe",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      };

      vi.mocked(mockDeps.createNote).mockResolvedValue(mockNote);

      await action.run(inputData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Starting note creation for job test-job-123"
      );

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        '[SAVE_NOTE] Successfully created note for job test-job-123, noteId: "note-123"'
      );
    });

    it("should handle createNote errors", async () => {
      const inputData = {
        file: mockParsedFile,
      };

      const saveError = new Error("Database save failed");
      vi.mocked(mockDeps.createNote).mockRejectedValue(saveError);

      await expect(
        action.run(inputData, mockDeps, mockContext)
      ).rejects.toThrow("Database save failed");

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SAVE_NOTE] Starting note creation for job test-job-123"
      );
    });

    it("should preserve all input data in output", async () => {
      const inputData = {
        file: mockParsedFile,
      };

      const mockNote: NoteWithParsedLines = {
        id: "note-123",
        title: "Test Recipe",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      };

      vi.mocked(mockDeps.createNote).mockResolvedValue(mockNote);

      const result = await action.run(inputData, mockDeps, mockContext);

      expect(result.file).toBe(inputData.file);
      expect(result.note).toBe(mockNote);
    });

    it("should handle note with parsed lines", async () => {
      const inputData = {
        file: mockParsedFile,
      };

      const mockNote: NoteWithParsedLines = {
        id: "note-123",
        title: "Test Recipe",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [
          {
            id: "ingredient-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        parsedInstructionLines: [
          {
            id: "instruction-1",
            originalText: "Mix ingredients",
            lineIndex: 0,
          },
        ],
      };

      vi.mocked(mockDeps.createNote).mockResolvedValue(mockNote);

      const result = await action.run(inputData, mockDeps, mockContext);

      expect(result.note.parsedIngredientLines).toHaveLength(1);
      expect(result.note.parsedInstructionLines).toHaveLength(1);
      expect(result.note.parsedIngredientLines[0]!.reference).toBe(
        "2 cups flour"
      );
      expect(result.note.parsedInstructionLines[0]!.originalText).toBe(
        "Mix ingredients"
      );
    });
  });

  describe("executeWithTiming", () => {
    it("should execute with timing and return result", async () => {
      const inputData = {
        file: mockParsedFile,
      };

      const mockNote: NoteWithParsedLines = {
        id: "note-123",
        title: "Test Recipe",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      };

      // Add a small delay to ensure duration > 0
      vi.mocked(mockDeps.createNote).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return mockNote;
      });

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...inputData,
          note: mockNote,
        });
        expect(result.duration).toBeGreaterThan(0);
      }
    });

    it("should handle errors with timing", async () => {
      const inputData = {
        file: mockParsedFile,
      };

      const saveError = new Error("Database save failed");
      // Add a small delay to ensure duration > 0
      vi.mocked(mockDeps.createNote).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw saveError;
      });

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(saveError);
        expect(result.duration).toBeGreaterThan(0);
      }
    });
  });
});

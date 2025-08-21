/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { SaveNoteAction } from "../../../../note/actions/save-note/action";

// Mock the schema
vi.mock("../../../../../schemas", () => ({
  SaveNoteDataSchema: {
    parse: vi.fn(),
  },
}));

// Mock the service
vi.mock("../../../../note/actions/save-note/service", () => ({
  saveNote: vi.fn(),
}));

describe("SaveNoteAction", () => {
  let action: SaveNoteAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockSaveNoteDataSchema: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create action instance
    action = new SaveNoteAction();

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
      },
    };

    // Create mock dependencies
    mockDeps = {
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
    } as NoteWorkerDependencies;

    // Create mock context
    mockContext = {
      jobId: "test-job-123",
      queueName: "notes",
      retryCount: 0,
      startTime: Date.now(),
      operation: "save_note",
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Get mocked schema
    const schemaModule = await import("../../../../../schemas");
    mockSaveNoteDataSchema = vi.mocked(schemaModule.SaveNoteDataSchema.parse);

    // Setup default mock implementations
    mockSaveNoteDataSchema.mockReturnValue(mockData);

    (mockDeps.services.saveNote as any).mockResolvedValue(mockData);
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.SAVE_NOTE);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data", () => {
      mockSaveNoteDataSchema.mockReturnValue(mockData);

      const result = action.validateInput(mockData);

      expect(result).toBeNull();
      expect(mockSaveNoteDataSchema).toHaveBeenCalledWith(mockData);
    });

    it("should return error for invalid data", () => {
      const validationError = new Error("Validation failed");
      mockSaveNoteDataSchema.mockImplementation(() => {
        throw validationError;
      });

      const result = action.validateInput(mockData);

      expect(result).toBe(validationError);
      expect(mockSaveNoteDataSchema).toHaveBeenCalledWith(mockData);
    });

    it("should return error for non-Error exceptions", () => {
      mockSaveNoteDataSchema.mockImplementation(() => {
        throw "String error";
      });

      const result = action.validateInput(mockData);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("String error");
    });

    it("should handle data without file property", () => {
      const dataWithoutFile = {
        ...mockData,
        file: undefined,
      };
      mockSaveNoteDataSchema.mockImplementation(() => {
        throw new Error("File is required");
      });

      const result = action.validateInput(dataWithoutFile);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("File is required");
    });

    it("should handle empty content", () => {
      const dataWithEmptyContent = {
        ...mockData,
        content: "",
      };
      mockSaveNoteDataSchema.mockImplementation(() => {
        throw new Error("Content cannot be empty");
      });

      const result = action.validateInput(dataWithEmptyContent);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Content cannot be empty");
    });

    it("should handle missing content property", () => {
      const dataWithoutContent = {
        jobId: "test-job-123",
        noteId: "test-note-456",
        importId: "test-import-789",
        metadata: { source: "test" },
      } as unknown as NotePipelineData;
      mockSaveNoteDataSchema.mockImplementation(() => {
        throw new Error("Content is required");
      });

      const result = action.validateInput(dataWithoutContent);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Content is required");
    });
  });

  describe("execute", () => {
    it("should execute the service action with correct parameters", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.services.saveNote).toHaveBeenCalledWith(mockData);
      expect(result).toBe(mockData);
    });

    it("should call executeServiceAction with correct options", async () => {
      // Spy on executeServiceAction

      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(mockData, mockDeps, mockContext);

      expect(executeServiceActionSpy).toHaveBeenCalledWith({
        data: mockData,
        deps: mockDeps,
        context: mockContext,
        serviceCall: expect.any(Function),
        contextName: "save_note",
        startMessage: "Creating note structure...",
        completionMessage: "Created note structure",
      });
    });

    it("should handle service call correctly", async () => {
      const savedData = {
        ...mockData,
        noteId: "new-note-789",
        note: {
          id: "new-note-789",
          title: "Saved Recipe",
          content: mockData.content,
          html: mockData.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };
      (mockDeps.services.saveNote as any).mockResolvedValue(savedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(savedData);
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service error");
      (mockDeps.services.saveNote as any).mockRejectedValue(serviceError);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should maintain retryable configuration", () => {
      expect(action.retryable).toBe(true);
    });

    it("should maintain priority configuration", () => {
      expect(action.priority).toBe(0);
    });

    it("should work with different dependency configurations", async () => {
      const minimalDeps = {
        services: {
          parseHtml: vi.fn(),
          cleanHtml: vi.fn(),
          saveNote: vi.fn().mockResolvedValue(mockData),
        },
        logger: {
          log: vi.fn(),
        },
      } as NoteWorkerDependencies;

      const result = await action.execute(mockData, minimalDeps, mockContext);

      expect(result).toBe(mockData);
    });

    it("should work with different context configurations", async () => {
      const differentContext = {
        jobId: "different-job",
        queueName: "different-queue",
        retryCount: 1,
        startTime: Date.now() - 1000,
        operation: "save_note",
        workerName: "different-worker",
        attemptNumber: 2,
      };

      const result = await action.execute(mockData, mockDeps, differentContext);

      expect(result).toBe(mockData);
    });

    it("should handle null or undefined data gracefully", async () => {
      const nullData = null as unknown as NotePipelineData;
      (mockDeps.services.saveNote as any).mockResolvedValue(nullData);

      const result = await action.execute(nullData, mockDeps, mockContext);

      expect(result).toBe(nullData);
    });

    it("should handle data with complex file structure", async () => {
      const complexData = {
        ...mockData,
        file: {
          title: "Complex Recipe",
          contents: "<html><body><h1>Complex Recipe</h1></body></html>",
          ingredients: [
            { reference: "Complex Ingredient 1", blockIndex: 1, lineIndex: 5 },
            { reference: "Complex Ingredient 2", blockIndex: 2, lineIndex: 10 },
          ],
          instructions: [
            { reference: "Complex Step 1", lineIndex: 5 },
            { reference: "Complex Step 2", lineIndex: 10 },
          ],
          image: "complex-recipe.jpg",
          source: "https://example.com/complex-recipe",
          historicalCreatedAt: new Date("2023-01-01"),
        },
      };
      (mockDeps.services.saveNote as any).mockResolvedValue(complexData);

      const result = await action.execute(complexData, mockDeps, mockContext);

      expect(result).toBe(complexData);
      expect(mockDeps.services.saveNote).toHaveBeenCalledWith(complexData);
    });
  });

  describe("inheritance and type safety", () => {
    it("should extend BaseAction correctly", () => {
      expect(action).toBeInstanceOf(SaveNoteAction);
      expect(action).toHaveProperty("execute");
      expect(action).toHaveProperty("name");
      expect(action).toHaveProperty("validateInput");
    });

    it("should implement required interface methods", () => {
      expect(typeof action.execute).toBe("function");
      expect(typeof action.name).toBe("string");
      expect(typeof action.validateInput).toBe("function");
    });

    it("should have correct generic types", () => {
      // This test ensures TypeScript compilation works correctly
      const typedAction: SaveNoteAction = action;
      expect(typedAction).toBeDefined();
    });
  });
});

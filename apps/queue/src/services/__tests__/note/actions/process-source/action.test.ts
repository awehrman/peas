/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { ProcessSourceAction } from "../../../../note/actions/process-source/action";

// Mock the service
vi.mock("../../../../note/actions/process-source/service", () => ({
  processSource: vi.fn(),
}));

describe("ProcessSourceAction", () => {
  let action: ProcessSourceAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockProcessSource: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create action instance
    action = new ProcessSourceAction();

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
        evernoteMetadata: {
          source: "https://example.com/recipe",
        },
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
      operation: "process_source",
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Get mocked service function
    const serviceModule = await import(
      "../../../../note/actions/process-source/service"
    );
    mockProcessSource = vi.mocked(serviceModule.processSource);

    // Setup default mock implementations
    mockProcessSource.mockResolvedValue(mockData);
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.PROCESS_SOURCE);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data with noteId", () => {
      const result = action.validateInput(mockData);

      expect(result).toBeNull();
    });

    it("should return error for data without noteId", () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: undefined,
      };

      const result = action.validateInput(dataWithoutNoteId);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for source processing");
    });

    it("should return error for data with null noteId", () => {
      const dataWithNullNoteId = {
        ...mockData,
        noteId: null as unknown as string,
      };

      const result = action.validateInput(dataWithNullNoteId);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for source processing");
    });

    it("should return error for data with empty string noteId", () => {
      const dataWithEmptyNoteId = {
        ...mockData,
        noteId: "",
      };

      const result = action.validateInput(dataWithEmptyNoteId);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for source processing");
    });

    it("should return null for data with whitespace noteId (validation only checks for falsy values)", () => {
      const dataWithWhitespaceNoteId = {
        ...mockData,
        noteId: "   ",
      };

      const result = action.validateInput(dataWithWhitespaceNoteId);

      expect(result).toBeNull();
    });

    it("should handle data with complex noteId", () => {
      const dataWithComplexNoteId = {
        ...mockData,
        noteId: "complex-note-id-with-special-chars-123",
      };

      const result = action.validateInput(dataWithComplexNoteId);

      expect(result).toBeNull();
    });
  });

  describe("execute", () => {
    it("should execute the service action with correct parameters", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockProcessSource).toHaveBeenCalledWith(mockData, mockDeps.logger);
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
        contextName: "PROCESS_SOURCE",
        startMessage: "Processing source...",
        completionMessage: "Added source...",
      });
    });

    it("should handle service call correctly", async () => {
      const processedData = {
        ...mockData,
        noteId: "processed-note-789",
        metadata: { ...mockData.metadata, processed: true },
      };
      mockProcessSource.mockResolvedValue(processedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(processedData);
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service error");
      mockProcessSource.mockRejectedValue(serviceError);

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
          saveNote: vi.fn(),
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
        operation: "process_source",
        workerName: "different-worker",
        attemptNumber: 2,
      };

      const result = await action.execute(mockData, mockDeps, differentContext);

      expect(result).toBe(mockData);
    });

    it("should handle data with different noteId values", async () => {
      const dataWithDifferentNoteId = {
        ...mockData,
        noteId: "different-note-id",
      };

      const result = await action.execute(
        dataWithDifferentNoteId,
        mockDeps,
        mockContext
      );

      expect(result).toBe(mockData); // Service returns the original mockData
      expect(mockProcessSource).toHaveBeenCalledWith(
        dataWithDifferentNoteId,
        mockDeps.logger
      );
    });

    it("should handle data with complex structure", async () => {
      const complexData = {
        ...mockData,
        noteId: "complex-note-id",
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

      const result = await action.execute(complexData, mockDeps, mockContext);

      expect(result).toBe(mockData); // Service returns the original mockData
      expect(mockProcessSource).toHaveBeenCalledWith(
        complexData,
        mockDeps.logger
      );
    });
  });

  describe("inheritance and type safety", () => {
    it("should extend BaseAction correctly", () => {
      expect(action).toBeInstanceOf(ProcessSourceAction);
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
      const typedAction: ProcessSourceAction = action;
      expect(typedAction).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined data gracefully", async () => {
      const nullData = null as unknown as NotePipelineData;

      // When data is null, accessing data.noteId will throw a TypeError
      await expect(
        action.execute(nullData, mockDeps, mockContext)
      ).rejects.toThrow(TypeError);
    });

    it("should handle data without required properties", async () => {
      const minimalData = {
        noteId: "minimal-note-id",
      } as unknown as NotePipelineData;

      const result = await action.execute(minimalData, mockDeps, mockContext);

      expect(result).toBe(mockData); // Service returns the original mockData
    });

    it("should handle service returning different data structure", async () => {
      const modifiedData = {
        ...mockData,
        noteId: "modified-note-id",
        metadata: { ...mockData.metadata, modified: true },
      };
      mockProcessSource.mockResolvedValue(modifiedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(modifiedData);
      expect(result.noteId).toBe("modified-note-id");
      expect(result.metadata?.modified).toBe(true);
    });
  });
});

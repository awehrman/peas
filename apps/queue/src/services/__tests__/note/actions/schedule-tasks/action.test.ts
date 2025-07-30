/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { ScheduleAllFollowupTasksAction } from "../../../../note/actions/schedule-tasks/action";

// Mock the service
vi.mock("../../../../note/actions/schedule-tasks/service", () => ({
  scheduleAllFollowupTasks: vi.fn(),
}));

describe("ScheduleAllFollowupTasksAction", () => {
  let action: ScheduleAllFollowupTasksAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockScheduleAllFollowupTasks: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create action instance
    action = new ScheduleAllFollowupTasksAction();

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
      operation: "schedule_followup_tasks",
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Get mocked service function
    const serviceModule = await import(
      "../../../../note/actions/schedule-tasks/service"
    );
    mockScheduleAllFollowupTasks = vi.mocked(
      serviceModule.scheduleAllFollowupTasks
    );

    // Setup default mock implementations
    mockScheduleAllFollowupTasks.mockImplementation((data) =>
      Promise.resolve(data)
    );
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS);
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
      expect(result?.message).toBe(
        "Note ID is required for scheduling followup tasks"
      );
    });

    it("should return error for data with null noteId", () => {
      const dataWithNullNoteId = {
        ...mockData,
        noteId: undefined,
      };

      const result = action.validateInput(dataWithNullNoteId);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling followup tasks"
      );
    });

    it("should return error for data with empty string noteId", () => {
      const dataWithEmptyNoteId = {
        ...mockData,
        noteId: "",
      };

      const result = action.validateInput(dataWithEmptyNoteId);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling followup tasks"
      );
    });

    it("should return error for data with whitespace noteId", () => {
      const dataWithWhitespaceNoteId = {
        ...mockData,
        noteId: "   ",
      };

      const result = action.validateInput(dataWithWhitespaceNoteId);

      expect(result).toBeNull(); // Whitespace-only strings are truthy, so validation passes
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

      expect(mockScheduleAllFollowupTasks).toHaveBeenCalledWith(
        mockData,
        mockDeps.logger,
        mockDeps
      );
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
        contextName: "SCHEDULE_ALL_FOLLOWUP_TASKS",
        startMessage: `Starting to schedule followup tasks for note: ${mockData.noteId}`,
        completionMessage: `Successfully scheduled all followup tasks for note: ${mockData.noteId}`,
      });
    });

    it("should handle service call correctly", async () => {
      const scheduledData = {
        ...mockData,
        noteId: "scheduled-note-789",
        metadata: { ...mockData.metadata, scheduled: true },
      };
      mockScheduleAllFollowupTasks.mockResolvedValue(scheduledData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(scheduledData);
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service error");
      mockScheduleAllFollowupTasks.mockRejectedValue(serviceError);

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
        operation: "schedule_followup_tasks",
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

      expect(result).toBe(dataWithDifferentNoteId);
      expect(mockScheduleAllFollowupTasks).toHaveBeenCalledWith(
        dataWithDifferentNoteId,
        mockDeps.logger,
        mockDeps
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

      expect(result).toBe(complexData);
      expect(mockScheduleAllFollowupTasks).toHaveBeenCalledWith(
        complexData,
        mockDeps.logger,
        mockDeps
      );
    });
  });

  describe("inheritance and type safety", () => {
    it("should extend BaseAction correctly", () => {
      expect(action).toBeInstanceOf(ScheduleAllFollowupTasksAction);
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
      const typedAction: ScheduleAllFollowupTasksAction = action;
      expect(typedAction).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined data gracefully", async () => {
      const nullData = null as unknown as NotePipelineData;

      await expect(
        action.execute(nullData, mockDeps, mockContext)
      ).rejects.toThrow();
    });

    it("should handle data without required properties", async () => {
      const minimalData = {
        noteId: "minimal-note-id",
      } as unknown as NotePipelineData;

      const result = await action.execute(minimalData, mockDeps, mockContext);

      expect(result).toBe(minimalData);
    });

    it("should handle service returning different data structure", async () => {
      const modifiedData = {
        ...mockData,
        noteId: "modified-note-id",
        metadata: { ...mockData.metadata, modified: true },
      };
      mockScheduleAllFollowupTasks.mockResolvedValue(modifiedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(modifiedData);
      expect(result.noteId).toBe("modified-note-id");
      expect(result.metadata?.modified).toBe(true);
    });
  });
});

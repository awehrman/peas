/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import { scheduleAllFollowupTasks } from "../../../../note/actions/schedule-tasks/service";

// Mock the ProcessSourceAction
vi.mock("../../../../note/actions/process-source/action", () => ({
  ProcessSourceAction: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({}),
  })),
}));

describe("scheduleAllFollowupTasks", () => {
  let mockData: NotePipelineData;
  let mockLogger: StructuredLogger;
  let mockDeps: NoteWorkerDependencies;
  let mockProcessSourceAction: any;

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
        },
      },
    };

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
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

    // Get mocked ProcessSourceAction
    const processSourceModule = await import(
      "../../../../note/actions/process-source/action"
    );
    mockProcessSourceAction = vi.mocked(
      processSourceModule.ProcessSourceAction
    );

    // Setup default mock implementations
    mockProcessSourceAction.mockImplementation(() => ({
      execute: vi.fn().mockResolvedValue(mockData),
    }));
  });

  describe("basic functionality", () => {
    it("should schedule followup tasks and return data", async () => {
      const result = await scheduleAllFollowupTasks(
        mockData,
        mockLogger,
        mockDeps
      );

      expect(result).toBe(mockData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_ALL_FOLLOWUP_TASKS] Starting to schedule followup tasks for note: ${mockData.noteId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_ALL_FOLLOWUP_TASKS] Successfully scheduled all followup tasks for note: ${mockData.noteId}`
      );
    });

    it("should create ProcessSourceAction instance", async () => {
      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      expect(mockProcessSourceAction).toHaveBeenCalled();
    });

    it("should execute ProcessSourceAction with correct parameters", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      expect(mockExecute).toHaveBeenCalledWith(mockData, mockDeps, {
        jobId: "schedule-followup-tasks",
        retryCount: 0,
        queueName: "note_processing",
        operation: "schedule_followup_tasks",
        startTime: expect.any(Number),
        workerName: "note_worker",
        attemptNumber: 1,
      });
    });

    it("should create context with correct properties", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      const contextArg = mockExecute.mock.calls[0]?.[2];
      expect(contextArg).toEqual({
        jobId: "schedule-followup-tasks",
        retryCount: 0,
        queueName: "note_processing",
        operation: "schedule_followup_tasks",
        startTime: expect.any(Number),
        workerName: "note_worker",
        attemptNumber: 1,
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
        scheduleAllFollowupTasks(dataWithoutNoteId, mockLogger, mockDeps)
      ).rejects.toThrow("No note ID available for scheduling followup tasks");
    });

    it("should throw error when noteId is null", async () => {
      const dataWithNullNoteId = {
        ...mockData,
        noteId: null,
      };

      await expect(
        scheduleAllFollowupTasks(
          dataWithNullNoteId as any,
          mockLogger,
          mockDeps
        )
      ).rejects.toThrow("No note ID available for scheduling followup tasks");
    });

    it("should throw error when noteId is empty string", async () => {
      const dataWithEmptyNoteId = {
        ...mockData,
        noteId: "",
      };

      await expect(
        scheduleAllFollowupTasks(dataWithEmptyNoteId, mockLogger, mockDeps)
      ).rejects.toThrow("No note ID available for scheduling followup tasks");
    });

    it("should work with valid noteId", async () => {
      const dataWithValidNoteId = {
        ...mockData,
        noteId: "valid-note-id",
      };

      const result = await scheduleAllFollowupTasks(
        dataWithValidNoteId,
        mockLogger,
        mockDeps
      );

      expect(result).toBe(dataWithValidNoteId);
    });
  });

  describe("logging", () => {
    it("should log start message with correct noteId", async () => {
      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_ALL_FOLLOWUP_TASKS] Starting to schedule followup tasks for note: ${mockData.noteId}`
      );
    });

    it("should log completion message with correct noteId", async () => {
      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_ALL_FOLLOWUP_TASKS] Successfully scheduled all followup tasks for note: ${mockData.noteId}`
      );
    });

    it("should log error message when action execution fails", async () => {
      const actionError = new Error("Action execution failed");
      mockProcessSourceAction.mockImplementation(() => ({
        execute: vi.fn().mockRejectedValue(actionError),
      }));

      await expect(
        scheduleAllFollowupTasks(mockData, mockLogger, mockDeps)
      ).rejects.toThrow("Action execution failed");
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_ALL_FOLLOWUP_TASKS] Failed to schedule followup tasks: Error: Action execution failed`
      );
    });

    it("should log error message with different error types", async () => {
      const stringError = "String error";
      mockProcessSourceAction.mockImplementation(() => ({
        execute: vi.fn().mockRejectedValue(stringError),
      }));

      await expect(
        scheduleAllFollowupTasks(mockData, mockLogger, mockDeps)
      ).rejects.toThrow("String error");
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_ALL_FOLLOWUP_TASKS] Failed to schedule followup tasks: String error`
      );
    });
  });

  describe("error handling", () => {
    it("should handle ProcessSourceAction execution errors", async () => {
      const actionError = new Error("Process source failed");
      mockProcessSourceAction.mockImplementation(() => ({
        execute: vi.fn().mockRejectedValue(actionError),
      }));

      await expect(
        scheduleAllFollowupTasks(mockData, mockLogger, mockDeps)
      ).rejects.toThrow("Process source failed");
    });

    it("should handle ProcessSourceAction constructor errors", async () => {
      mockProcessSourceAction.mockImplementation(() => {
        throw new Error("Constructor failed");
      });

      await expect(
        scheduleAllFollowupTasks(mockData, mockLogger, mockDeps)
      ).rejects.toThrow("Constructor failed");
    });

    it("should handle non-Error exceptions", async () => {
      mockProcessSourceAction.mockImplementation(() => ({
        execute: vi.fn().mockRejectedValue("String error"),
      }));

      await expect(
        scheduleAllFollowupTasks(mockData, mockLogger, mockDeps)
      ).rejects.toThrow("String error");
    });

    it("should handle Promise.all rejection", async () => {
      const actionError = new Error("Parallel execution failed");
      mockProcessSourceAction.mockImplementation(() => ({
        execute: vi.fn().mockRejectedValue(actionError),
      }));

      await expect(
        scheduleAllFollowupTasks(mockData, mockLogger, mockDeps)
      ).rejects.toThrow("Parallel execution failed");
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

      const result = await scheduleAllFollowupTasks(
        complexData,
        mockLogger,
        mockDeps
      );

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
      const result = await scheduleAllFollowupTasks(
        mockData,
        mockLogger,
        mockDeps
      );

      expect(result).toBe(mockData);
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined data", async () => {
      await expect(
        scheduleAllFollowupTasks(null as any, mockLogger, mockDeps)
      ).rejects.toThrow();
    });

    it("should handle null or undefined logger", async () => {
      await expect(
        scheduleAllFollowupTasks(mockData, null as any, mockDeps)
      ).rejects.toThrow();
    });

    it("should handle null or undefined deps", async () => {
      const result = await scheduleAllFollowupTasks(
        mockData,
        mockLogger,
        null as any
      );

      expect(result).toBe(mockData);
    });

    it("should handle logger without log method", async () => {
      const invalidLogger = {} as StructuredLogger;

      await expect(
        scheduleAllFollowupTasks(mockData, invalidLogger, mockDeps)
      ).rejects.toThrow();
    });

    it("should handle data with minimal required fields", async () => {
      const minimalData = {
        noteId: "minimal-note-id",
      } as unknown as NotePipelineData;

      const result = await scheduleAllFollowupTasks(
        minimalData,
        mockLogger,
        mockDeps
      );

      expect(result).toBe(minimalData);
    });

    it("should handle data with different noteId values", async () => {
      const dataWithDifferentNoteId = {
        ...mockData,
        noteId: "different-note-id",
      };

      const result = await scheduleAllFollowupTasks(
        dataWithDifferentNoteId,
        mockLogger,
        mockDeps
      );

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
          ...mockData.file,
          contents: largeContent,
        },
      };

      const result = await scheduleAllFollowupTasks(
        dataWithLargeContent as any,
        mockLogger,
        mockDeps
      );
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
          ...mockData.file,
          ingredients: manyIngredients,
          instructions: manyInstructions,
        },
      };

      const result = await scheduleAllFollowupTasks(
        dataWithManyItems as any,
        mockLogger,
        mockDeps
      );

      expect(result).toBe(dataWithManyItems);
      expect(result.file?.ingredients).toHaveLength(1000);
      expect(result.file?.instructions).toHaveLength(500);
    });
  });

  describe("context creation", () => {
    it("should create context with correct jobId", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      const contextArg = mockExecute.mock.calls[0]?.[2];
      expect(contextArg?.jobId).toBe("schedule-followup-tasks");
    });

    it("should create context with correct queueName", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      const contextArg = mockExecute.mock.calls[0]?.[2];
      expect(contextArg?.queueName).toBe("note_processing");
    });

    it("should create context with correct operation", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      const contextArg = mockExecute.mock.calls[0]?.[2];
      expect(contextArg?.operation).toBe("schedule_followup_tasks");
    });

    it("should create context with correct workerName", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      const contextArg = mockExecute.mock.calls[0]?.[2];
      expect(contextArg?.workerName).toBe("note_worker");
    });

    it("should create context with correct attemptNumber", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      const contextArg = mockExecute.mock.calls[0]?.[2];
      expect(contextArg?.attemptNumber).toBe(1);
    });

    it("should create context with current timestamp", async () => {
      const mockExecute = vi.fn().mockResolvedValue(mockData);
      mockProcessSourceAction.mockImplementation(() => ({
        execute: mockExecute,
      }));
      const beforeTime = Date.now();

      await scheduleAllFollowupTasks(mockData, mockLogger, mockDeps);

      const contextArg = mockExecute.mock.calls[0]?.[2];
      const afterTime = Date.now();
      expect(contextArg?.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(contextArg?.startTime).toBeLessThanOrEqual(afterTime);
    });
  });
});

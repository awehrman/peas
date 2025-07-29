import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import type { ActionContext } from "../../../workers/core/types";
import { ScheduleInstructionsAction, scheduleInstructions } from "../../note/schedule-instructions";

describe("ScheduleInstructionsAction", () => {
  let action: ScheduleInstructionsAction;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: NotePipelineData;

  beforeEach(() => {
    action = new ScheduleInstructionsAction();

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    } as NoteWorkerDependencies;

    mockContext = {
      jobId: "test-job-id",
      attemptNumber: 1,
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
    };

    mockData = {
      noteId: "test-note-id",
      content: "test content",
      importId: "test-import-id",
    };
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.SCHEDULE_INSTRUCTIONS);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data with noteId", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error for data without noteId", () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };
      const result = action.validateInput(dataWithoutNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for instruction scheduling"
      );
    });

    it("should return error for data with undefined noteId", () => {
      const dataWithUndefinedNoteId = { ...mockData, noteId: undefined };
      const result = action.validateInput(dataWithUndefinedNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for instruction scheduling"
      );
    });
  });

  describe("execute", () => {
    it("should execute successfully and return the data", async () => {
      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting instruction scheduling for note: test-note-id"
        )
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully scheduled instruction processing for note: test-note-id"
        )
      );
    });

    it("should handle errors and log them", async () => {
      // Mock the logger to throw an error
      const mockError = new Error("Test error");
      mockDependencies.logger.log = vi.fn().mockImplementation(() => {
        throw mockError;
      });

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("Test error");
    });
  });

  describe("scheduleInstructions function", () => {
    it("should schedule instruction processing successfully", async () => {
      const result = await scheduleInstructions(
        mockData,
        mockDependencies.logger
      );

      expect(result).toBe(mockData);
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting instruction scheduling for note: test-note-id"
        )
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully scheduled instruction processing for note: test-note-id"
        )
      );
    });

    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };

      await expect(
        scheduleInstructions(dataWithoutNoteId, mockDependencies.logger)
      ).rejects.toThrow("No note ID available for instruction scheduling");
    });

    it("should handle errors and log them", async () => {
      // Create a mock that will throw an error when called
      const mockError = new Error("Test error");
      const originalLog = mockDependencies.logger.log;

      // Mock the logger to throw an error on the second call (during the try block)
      let callCount = 0;
      mockDependencies.logger.log = vi.fn().mockImplementation((message: string) => {
        callCount++;
        if (callCount === 2) { // Second log call (during try block)
          throw mockError;
        }
        originalLog(message);
      });

      await expect(
        scheduleInstructions(mockData, mockDependencies.logger)
      ).rejects.toThrow("Test error");

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to schedule instruction processing: Error: Test error"
        )
      );
    });
  });

  describe("action configuration", () => {
    it("should have retryable set to true by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have priority set to 0 by default", () => {
      expect(action.priority).toBe(0);
    });

    it("should allow configuration changes", () => {
      action.retryable = false;
      action.priority = 5;

      expect(action.retryable).toBe(false);
      expect(action.priority).toBe(5);
    });
  });
}); 
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import type { ActionContext } from "../../../workers/core/types";
import {
  ScheduleAllFollowupTasksAction,
  scheduleAllFollowupTasks,
} from "../../note/schedule-all-followup-tasks";

describe("ScheduleAllFollowupTasksAction", () => {
  let action: ScheduleAllFollowupTasksAction;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: NotePipelineData;

  beforeEach(() => {
    action = new ScheduleAllFollowupTasksAction();

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
      retryCount: 0,
      queueName: "notes",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
      content: "Test content",
      importId: "test-import-id",
      noteId: "test-note-id",
    };
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
      const dataWithoutNoteId = { ...mockData, noteId: undefined };
      const result = action.validateInput(dataWithoutNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling followup tasks"
      );
    });

    it("should return error for data with null noteId", () => {
      const dataWithNullNoteId = { ...mockData, noteId: undefined };
      const result = action.validateInput(dataWithNullNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling followup tasks"
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
          "Starting to schedule followup tasks for note: test-note-id"
        )
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully scheduled all followup tasks for note: test-note-id"
        )
      );
    });

    it("should log scheduling of each task type", async () => {
      await action.execute(mockData, mockDependencies, mockContext);

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Scheduling source processing")
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Scheduling image processing")
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Scheduling ingredient processing")
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Scheduling instruction processing")
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

  describe("scheduleAllFollowupTasks function", () => {
    it("should schedule all followup tasks successfully", async () => {
      const result = await scheduleAllFollowupTasks(
        mockData,
        mockDependencies.logger
      );

      expect(result).toBe(mockData);
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting to schedule followup tasks for note: test-note-id"
        )
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully scheduled all followup tasks for note: test-note-id"
        )
      );
    });

    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };

      await expect(
        scheduleAllFollowupTasks(dataWithoutNoteId, mockDependencies.logger)
      ).rejects.toThrow("No note ID available for scheduling followup tasks");
    });

    it("should handle errors and log them", async () => {
      // Create a mock that will throw an error when called
      const mockError = new Error("Test error");
      const originalLog = mockDependencies.logger.log;

      // Mock the logger to throw an error on the second call (during the try block)
      let callCount = 0;
      mockDependencies.logger.log = vi
        .fn()
        .mockImplementation((message: string) => {
          callCount++;
          if (callCount === 2) {
            // Second log call (during try block)
            throw mockError;
          }
          originalLog(message);
        });

      await expect(
        scheduleAllFollowupTasks(mockData, mockDependencies.logger)
      ).rejects.toThrow("Test error");

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to schedule followup tasks: Error: Test error"
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
      const configuredAction = action.withConfig({
        retryable: false,
        priority: 5,
      });
      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(5);
    });
  });
});

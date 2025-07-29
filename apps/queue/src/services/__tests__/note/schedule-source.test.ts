import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import type { ActionContext } from "../../../workers/core/types";
import {
  ScheduleSourceAction,
  scheduleSource,
} from "../../note/schedule-source";

describe("ScheduleSourceAction", () => {
  let action: ScheduleSourceAction;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: NotePipelineData;

  beforeEach(() => {
    action = new ScheduleSourceAction();

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
      expect(action.name).toBe(ActionName.SCHEDULE_SOURCE);
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
      expect(result?.message).toBe("Note ID is required for source scheduling");
    });

    it("should return error for data with null noteId", () => {
      const dataWithNullNoteId = {
        ...mockData,
        noteId: null as unknown as undefined,
      };
      const result = action.validateInput(dataWithNullNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for source scheduling");
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
          "Starting source scheduling for note: test-note-id"
        )
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully scheduled source processing for note: test-note-id"
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

  describe("scheduleSource function", () => {
    it("should schedule source processing successfully", async () => {
      const result = await scheduleSource(mockData, mockDependencies.logger);

      expect(result).toBe(mockData);
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting source scheduling for note: test-note-id"
        )
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully scheduled source processing for note: test-note-id"
        )
      );
    });

    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };

      await expect(
        scheduleSource(dataWithoutNoteId, mockDependencies.logger)
      ).rejects.toThrow("No note ID available for source scheduling");
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
        scheduleSource(mockData, mockDependencies.logger)
      ).rejects.toThrow("Test error");

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to schedule source processing: Error: Test error"
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

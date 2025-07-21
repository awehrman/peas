import { describe, it, expect, beforeEach, vi } from "vitest";
import { ScheduleSourceAction } from "../schedule-source";
import type { ScheduleSourceData } from "../../schema";
import type { ActionContext } from "../../../core/types";
import type { ScheduleSourceDeps } from "../../types";

describe("ScheduleSourceAction", () => {
  let action: ScheduleSourceAction;
  let mockDeps: ScheduleSourceDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new ScheduleSourceAction();
    mockDeps = {
      sourceQueue: {
        add: vi.fn().mockResolvedValue({ id: "source-job-123" }),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "schedule_source",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should schedule source processing job successfully", async () => {
      const data: ScheduleSourceData = {
        noteId: "test-note-456",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.sourceQueue.add).toHaveBeenCalledWith("process-source", {
        noteId: "test-note-456",
      });
    });

    it("should handle source scheduling with different note IDs", async () => {
      const data: ScheduleSourceData = {
        noteId: "different-note-789",
        file: {
          title: "Another Recipe",
          contents: "different content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.sourceQueue.add).toHaveBeenCalledWith("process-source", {
        noteId: "different-note-789",
      });
    });

    it("should handle source scheduling with null noteId", async () => {
      const data: ScheduleSourceData = {
        noteId: null as unknown as string,
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.sourceQueue.add).toHaveBeenCalledWith("process-source", {
        noteId: null,
      });
    });

    it("should handle source scheduling with undefined noteId", async () => {
      const data: ScheduleSourceData = {
        noteId: undefined as unknown as string,
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.sourceQueue.add).toHaveBeenCalledWith("process-source", {
        noteId: undefined,
      });
    });

    it("should handle source scheduling with empty string noteId", async () => {
      const data: ScheduleSourceData = {
        noteId: "",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.sourceQueue.add).toHaveBeenCalledWith("process-source", {
        noteId: "",
      });
    });

    it("should handle queue errors gracefully", async () => {
      const data: ScheduleSourceData = {
        noteId: "test-note-456",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const queueError = new Error("Queue is full");
      mockDeps.sourceQueue.add = vi.fn().mockRejectedValue(queueError);

      await expect(action.execute(data, mockDeps, mockContext)).rejects.toThrow(
        "Queue is full"
      );

      expect(mockDeps.sourceQueue.add).toHaveBeenCalledWith("process-source", {
        noteId: "test-note-456",
      });
    });

    it("should handle database connection errors", async () => {
      const data: ScheduleSourceData = {
        noteId: "test-note-456",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const dbError = new Error("Database connection failed");
      mockDeps.sourceQueue.add = vi.fn().mockRejectedValue(dbError);

      await expect(action.execute(data, mockDeps, mockContext)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle timeout errors", async () => {
      const data: ScheduleSourceData = {
        noteId: "test-note-456",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const timeoutError = new Error("Operation timed out");
      mockDeps.sourceQueue.add = vi.fn().mockRejectedValue(timeoutError);

      await expect(action.execute(data, mockDeps, mockContext)).rejects.toThrow(
        "Operation timed out"
      );
    });

    it("should execute with timing wrapper", async () => {
      const data: ScheduleSourceData = {
        noteId: "test-note-456",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.executeWithTiming(
        data,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle errors with timing wrapper", async () => {
      const data: ScheduleSourceData = {
        noteId: "test-note-456",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
      };

      // Mock the execute method to throw an error
      vi.spyOn(action, "execute").mockRejectedValue(new Error("Test error"));

      const result = await action.executeWithTiming(
        data,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Test error");
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("action properties", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe("schedule_source");
    });

    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(ScheduleSourceAction);
    });
  });
});

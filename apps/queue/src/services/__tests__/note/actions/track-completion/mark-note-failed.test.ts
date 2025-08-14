import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { MarkNoteAsFailedAction } from "../../../../note/actions/track-completion/mark-note-failed";

// Mock dependencies
vi.mock("../../../../note/actions/track-completion/service", () => ({
  markNoteAsFailed: vi.fn(),
}));

describe("MarkNoteAsFailedAction", () => {
  let action: MarkNoteAsFailedAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockData = {
      content: "test content",
      noteId: "test-note-id",
      importId: "test-import-id",
    };

    mockDeps = {
      logger: {
        log: vi.fn(),
      } as unknown as StructuredLogger,
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
      } as unknown as {
        addStatusEventAndBroadcast: (
          event: Record<string, unknown>
        ) => Promise<Record<string, unknown>>;
      },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    };

    mockContext = {
      jobId: "test-job-id",
      operation: "mark_note_failed",
      retryCount: 0,
      queueName: "test-queue",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("constructor", () => {
    it("should create action with error message", () => {
      action = new MarkNoteAsFailedAction("Test error message");
      expect(action).toBeInstanceOf(MarkNoteAsFailedAction);
    });

    it("should create action with error message and code", () => {
      action = new MarkNoteAsFailedAction(
        "Test error message",
        "HTML_PARSE_ERROR"
      );
      expect(action).toBeInstanceOf(MarkNoteAsFailedAction);
    });

    it("should create action with error message, code, and details", () => {
      action = new MarkNoteAsFailedAction(
        "Test error message",
        "HTML_PARSE_ERROR",
        { line: 10 }
      );
      expect(action).toBeInstanceOf(MarkNoteAsFailedAction);
    });
  });

  describe("name", () => {
    it("should return COMPLETION_STATUS", () => {
      action = new MarkNoteAsFailedAction("Test error message");
      expect(action.name).toBe("completion_status");
    });
  });

  describe("validateInput", () => {
    beforeEach(() => {
      action = new MarkNoteAsFailedAction("Test error message");
    });

    it("should return null for valid data", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error when noteId is missing", () => {
      const invalidData = { ...mockData, noteId: undefined };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for marking note as failed"
      );
    });

    it("should return error when error message is missing", () => {
      const actionWithoutMessage = new MarkNoteAsFailedAction("");
      const result = actionWithoutMessage.validateInput(mockData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Error message is required for marking note as failed"
      );
    });
  });

  describe("execute", () => {
    beforeEach(() => {
      action = new MarkNoteAsFailedAction("Test error message");
    });

    it("should mark note as failed successfully", async () => {
      const { markNoteAsFailed } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markNoteAsFailed).mockResolvedValue();

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(markNoteAsFailed).toHaveBeenCalledWith(
        "test-note-id",
        "Test error message",
        undefined,
        undefined,
        mockDeps.logger
      );
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);

      // Check start message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(1, {
        importId: "test-import-id",
        status: "FAILED",
        message: "Marking note as failed...",
        context: "mark_note_failed",
        noteId: "test-note-id",
        indentLevel: 1,
      });

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "FAILED",
        message: "Note marked as failed: Test error message",
        context: "mark_note_failed_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          errorMessage: "Test error message",
          errorCode: undefined,
          errorDetails: undefined,
        },
      });
    });

    it("should mark note as failed with error code", async () => {
      const actionWithCode = new MarkNoteAsFailedAction(
        "Test error message",
        "HTML_PARSE_ERROR"
      );
      const { markNoteAsFailed } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markNoteAsFailed).mockResolvedValue();

      const result = await actionWithCode.execute(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(markNoteAsFailed).toHaveBeenCalledWith(
        "test-note-id",
        "Test error message",
        "HTML_PARSE_ERROR",
        undefined,
        mockDeps.logger
      );

      // Check completion message with error code
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "FAILED",
        message: "Note marked as failed: Test error message",
        context: "mark_note_failed_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          errorMessage: "Test error message",
          errorCode: "HTML_PARSE_ERROR",
          errorDetails: undefined,
        },
      });
    });

    it("should mark note as failed with error code and details", async () => {
      const errorDetails = { line: 10, column: 5 };
      const actionWithDetails = new MarkNoteAsFailedAction(
        "Test error message",
        "HTML_PARSE_ERROR",
        errorDetails
      );
      const { markNoteAsFailed } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markNoteAsFailed).mockResolvedValue();

      const result = await actionWithDetails.execute(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(markNoteAsFailed).toHaveBeenCalledWith(
        "test-note-id",
        "Test error message",
        "HTML_PARSE_ERROR",
        errorDetails,
        mockDeps.logger
      );

      // Check completion message with error details
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "FAILED",
        message: "Note marked as failed: Test error message",
        context: "mark_note_failed_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          errorMessage: "Test error message",
          errorCode: "HTML_PARSE_ERROR",
          errorDetails: errorDetails,
        },
      });
    });

    it("should handle missing status broadcaster", async () => {
      const depsWithoutBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      const { markNoteAsFailed } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markNoteAsFailed).mockResolvedValue();

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(markNoteAsFailed).toHaveBeenCalledWith(
        "test-note-id",
        "Test error message",
        undefined,
        undefined,
        mockDeps.logger
      );
    });

    it("should throw error for invalid input - missing noteId", async () => {
      const invalidData = { ...mockData, noteId: undefined };

      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow("Note ID is required for marking note as failed");
    });

    it("should throw error for invalid input - missing error message", async () => {
      const actionWithoutMessage = new MarkNoteAsFailedAction("");

      await expect(
        actionWithoutMessage.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Error message is required for marking note as failed");
    });
  });
});

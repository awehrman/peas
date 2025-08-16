import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { InitializeCompletionTrackingAction } from "../../../../note/actions/track-completion/initialize-completion";

// Mock dependencies
vi.mock("../../../../note/actions/track-completion/service", () => ({
  initializeNoteCompletion: vi.fn(),
}));

describe("InitializeCompletionTrackingAction", () => {
  let action: InitializeCompletionTrackingAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    action = new InitializeCompletionTrackingAction();

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
      operation: "initialize_completion_tracking",
      retryCount: 0,
      queueName: "test-queue",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("name", () => {
    it("should return COMPLETION_STATUS", () => {
      expect(action.name).toBe("completion_status");
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error when noteId is missing", () => {
      const invalidData = { ...mockData, noteId: undefined };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for completion tracking initialization"
      );
    });

    it("should return error when importId is missing", () => {
      const invalidData = { ...mockData, importId: undefined };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Import ID is required for completion tracking initialization"
      );
    });
  });

  describe("execute", () => {
    it("should initialize completion tracking successfully", async () => {
      const { initializeNoteCompletion } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(initializeNoteCompletion).mockResolvedValue();

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(initializeNoteCompletion).toHaveBeenCalledWith(
        "test-note-id",
        "test-import-id",
        undefined, // htmlFileName
        mockDeps.logger
      );
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(1);

      // Check completion message (this action only sends completion, not start)
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-id",
        status: "COMPLETED",
        message: "Completion tracking initialized",
        context: "initialize_completion_tracking_complete",
        noteId: "test-note-id",
        indentLevel: 1,
      });
    });

    it("should handle missing status broadcaster", async () => {
      const depsWithoutBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      const { initializeNoteCompletion } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(initializeNoteCompletion).mockResolvedValue();

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(initializeNoteCompletion).toHaveBeenCalledWith(
        "test-note-id",
        "test-import-id",
        undefined, // htmlFileName
        mockDeps.logger
      );
    });

    it("should throw error for invalid input - missing noteId", async () => {
      const invalidData = { ...mockData, noteId: undefined };

      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow(
        "Note ID is required for completion tracking initialization"
      );
    });

    it("should throw error for invalid input - missing importId", async () => {
      const invalidData = { ...mockData, importId: undefined };

      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow(
        "Import ID is required for completion tracking initialization"
      );
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import type { StructuredLogger } from "../../../../../types";
import { TrackCompletionAction } from "../../../../note/actions/track-completion/action";

// Mock dependencies
vi.mock("../../../../note/actions/track-completion/service", () => ({
  getNoteCompletionStatus: vi.fn(),
}));

describe("TrackCompletionAction", () => {
  let action: TrackCompletionAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    action = new TrackCompletionAction();

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
      } as unknown as { addStatusEventAndBroadcast: (event: Record<string, unknown>) => Promise<Record<string, unknown>> },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    };

    mockContext = {
      jobId: "test-job-id",
      operation: "track_completion",
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
        "Note ID is required for completion tracking"
      );
    });
  });

  describe("execute", () => {
    it("should track completion status successfully with completed status", async () => {
      const { getNoteCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getNoteCompletionStatus).mockReturnValue({
        noteId: "test-note-id",
        importId: "test-import-id",
        noteWorkerCompleted: true,
        instructionWorkerCompleted: true,
        ingredientWorkerCompleted: true,
        imageWorkerCompleted: true,
        allCompleted: true,
        totalImageJobs: 2,
        completedImageJobs: 2,
        totalIngredientLines: 5,
        completedIngredientLines: new Set(["0:0", "0:1", "0:2", "0:3", "0:4"]),
      });

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);
      expect(getNoteCompletionStatus).toHaveBeenCalledWith("test-note-id");

      // Check start message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(1, {
        importId: "test-import-id",
        status: "PROCESSING",
        message: "Tracking completion status...",
        context: "track_completion",
        noteId: "test-note-id",
        indentLevel: 1,
      });

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "COMPLETED",
        message: "Completion status: All workers completed",
        context: "track_completion_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          noteWorkerCompleted: true,
          instructionWorkerCompleted: true,
          ingredientWorkerCompleted: true,
          imageWorkerCompleted: true,
          allCompleted: true,
          totalImageJobs: 2,
          completedImageJobs: 2,
          totalIngredientLines: 5,
          completedIngredientLines: 5,
        },
      });
    });

    it("should track completion status with in-progress status", async () => {
      const { getNoteCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getNoteCompletionStatus).mockReturnValue({
        noteId: "test-note-id",
        importId: "test-import-id",
        noteWorkerCompleted: true,
        instructionWorkerCompleted: false,
        ingredientWorkerCompleted: true,
        imageWorkerCompleted: false,
        allCompleted: false,
        totalImageJobs: 2,
        completedImageJobs: 1,
        totalIngredientLines: 5,
        completedIngredientLines: new Set(["0:0", "0:1"]),
      });

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);
      expect(getNoteCompletionStatus).toHaveBeenCalledWith("test-note-id");

      // Check completion message for in-progress status
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "PROCESSING",
        message: "Completion status: Workers in progress",
        context: "track_completion_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          noteWorkerCompleted: true,
          instructionWorkerCompleted: false,
          ingredientWorkerCompleted: true,
          imageWorkerCompleted: false,
          allCompleted: false,
          totalImageJobs: 2,
          completedImageJobs: 1,
          totalIngredientLines: 5,
          completedIngredientLines: 2,
        },
      });
    });

    it("should handle missing status broadcaster", async () => {
      const depsWithoutBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      const { getNoteCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getNoteCompletionStatus).mockReturnValue(undefined);

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(getNoteCompletionStatus).toHaveBeenCalledWith("test-note-id");
    });

    it("should handle no completion status found", async () => {
      const { getNoteCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getNoteCompletionStatus).mockReturnValue(undefined);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);

      // Check completion message for no status found
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "PROCESSING",
        message: "No completion status found",
        context: "track_completion_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          noteWorkerCompleted: false,
          instructionWorkerCompleted: false,
          ingredientWorkerCompleted: false,
          imageWorkerCompleted: false,
          allCompleted: false,
          totalImageJobs: 0,
          completedImageJobs: 0,
          totalIngredientLines: 0,
          completedIngredientLines: 0,
        },
      });
    });

    it("should throw error for invalid input", async () => {
      const invalidData = { ...mockData, noteId: undefined };

      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow("Note ID is required for completion tracking");
    });
  });
});

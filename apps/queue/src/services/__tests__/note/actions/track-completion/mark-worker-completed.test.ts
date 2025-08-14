import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import type { StructuredLogger } from "../../../../../types";
import { MarkWorkerCompletedAction } from "../../../../note/actions/track-completion/mark-worker-completed";

// Mock dependencies
vi.mock("../../../../note/actions/track-completion/service", () => ({
  markWorkerCompleted: vi.fn(),
}));

describe("MarkWorkerCompletedAction", () => {
  let action: MarkWorkerCompletedAction;
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
      } as unknown as { addStatusEventAndBroadcast: (event: Record<string, unknown>) => Promise<Record<string, unknown>> },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    };

    mockContext = {
      jobId: "test-job-id",
      operation: "mark_worker_completed",
      retryCount: 0,
      queueName: "test-queue",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("constructor", () => {
    it("should create action with note worker type", () => {
      action = new MarkWorkerCompletedAction("note");
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });

    it("should create action with instruction worker type", () => {
      action = new MarkWorkerCompletedAction("instruction");
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });

    it("should create action with ingredient worker type", () => {
      action = new MarkWorkerCompletedAction("ingredient");
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });

    it("should create action with image worker type", () => {
      action = new MarkWorkerCompletedAction("image");
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });
  });

  describe("name", () => {
    it("should return COMPLETION_STATUS", () => {
      action = new MarkWorkerCompletedAction("note");
      expect(action.name).toBe("completion_status");
    });
  });

  describe("validateInput", () => {
    beforeEach(() => {
      action = new MarkWorkerCompletedAction("note");
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
        "Note ID is required for marking worker completion"
      );
    });
  });

  describe("execute", () => {
    beforeEach(() => {
      action = new MarkWorkerCompletedAction("note");
    });

    it("should mark note worker as completed successfully", async () => {
      const { markWorkerCompleted } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markWorkerCompleted).mockResolvedValue();

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(markWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "note",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);

      // Check start message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(1, {
        importId: "test-import-id",
        status: "PROCESSING",
        message: "Marking note worker as completed...",
        context: "mark_worker_completed",
        noteId: "test-note-id",
        indentLevel: 1,
      });

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "COMPLETED",
        message: "note worker marked as completed",
        context: "mark_worker_completed_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          workerType: "note",
        },
      });
    });

    it("should mark instruction worker as completed successfully", async () => {
      const instructionAction = new MarkWorkerCompletedAction("instruction");
      const { markWorkerCompleted } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markWorkerCompleted).mockResolvedValue();

      const result = await instructionAction.execute(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(markWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "instruction",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "COMPLETED",
        message: "instruction worker marked as completed",
        context: "mark_worker_completed_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          workerType: "instruction",
        },
      });
    });

    it("should mark ingredient worker as completed successfully", async () => {
      const ingredientAction = new MarkWorkerCompletedAction("ingredient");
      const { markWorkerCompleted } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markWorkerCompleted).mockResolvedValue();

      const result = await ingredientAction.execute(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(markWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "ingredient",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "COMPLETED",
        message: "ingredient worker marked as completed",
        context: "mark_worker_completed_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          workerType: "ingredient",
        },
      });
    });

    it("should mark image worker as completed successfully", async () => {
      const imageAction = new MarkWorkerCompletedAction("image");
      const { markWorkerCompleted } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markWorkerCompleted).mockResolvedValue();

      const result = await imageAction.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(markWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "image",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "COMPLETED",
        message: "image worker marked as completed",
        context: "mark_worker_completed_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          workerType: "image",
        },
      });
    });

    it("should handle missing status broadcaster", async () => {
      const depsWithoutBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      const { markWorkerCompleted } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(markWorkerCompleted).mockResolvedValue();

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(markWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "note",
        mockDeps.logger,
        undefined
      );
    });

    it("should throw error for invalid input", async () => {
      const invalidData = { ...mockData, noteId: undefined };

      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow("Note ID is required for marking worker completion");
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompletionStatusAction } from "../completion-status";
import { ActionContext } from "../../../core/types";
import type { InstructionWorkerDependencies } from "../../types";

describe("CompletionStatusAction", () => {
  let action: CompletionStatusAction;
  let mockDeps: InstructionWorkerDependencies;
  let mockContext: ActionContext;

  const mockInput = {
    noteId: "test-note-123",
    importId: "test-import-456",
    currentInstructionIndex: 5,
    totalInstructions: 10,
    instructionLineId: "test-line-789",
    reference: "test reference",
    blockIndex: 0,
    lineIndex: 0,
    success: true,
    stepsSaved: 3,
    parseStatus: "CORRECT",
    normalizedText: "test instruction",
    stepsCount: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Clear the completedNotes Set between tests
    CompletionStatusAction.clearCompletedNotes();

    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn(async (operation) => operation()),
      },
      logger: {
        log: vi.fn(),
      },
      database: {
        updateInstructionLine: vi.fn(),
        createInstructionSteps: vi.fn(),
        checkNoteCompletion: vi.fn(),
        getNoteTitle: vi.fn(),
        updateNoteCompletionTracker: vi.fn(),
        incrementNoteCompletionTracker: vi.fn(),
      },
      parseInstruction: vi.fn(),
    };

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    action = new CompletionStatusAction();
  });

  describe("execute", () => {
    it("should handle missing noteId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inputWithoutNoteId = { ...mockInput, noteId: undefined as any };

      const result = await action.execute(
        inputWithoutNoteId,
        mockDeps,
        mockContext
      );

      expect(result).toEqual(inputWithoutNoteId);
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[COMPLETION_STATUS] Skipping completion check - missing noteId or importId"
      );
      expect(mockDeps.database?.checkNoteCompletion).not.toHaveBeenCalled();
    });

    it("should handle missing importId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inputWithoutImportId = { ...mockInput, importId: undefined as any };

      const result = await action.execute(
        inputWithoutImportId,
        mockDeps,
        mockContext
      );

      expect(result).toEqual(inputWithoutImportId);
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[COMPLETION_STATUS] Skipping completion check - missing noteId or importId"
      );
      expect(mockDeps.database?.checkNoteCompletion).not.toHaveBeenCalled();
    });

    it("should handle missing database checkNoteCompletion method", async () => {
      const depsWithoutCheckNoteCompletion = {
        ...mockDeps,
        database: { ...mockDeps.database, checkNoteCompletion: undefined },
      };

      const result = await action.execute(
        mockInput,
        depsWithoutCheckNoteCompletion,
        mockContext
      );

      expect(result).toEqual(mockInput);
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[COMPLETION_STATUS] Database checkNoteCompletion method not available"
      );
    });

    it("should handle database checkNoteCompletion error", async () => {
      const dbError = new Error("Database connection failed");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockRejectedValue(
        dbError
      );

      const result = await action.execute(mockInput, mockDeps, mockContext);

      expect(result).toEqual(mockInput);
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        `[COMPLETION_STATUS] Error checking completion status for note ${mockInput.noteId}: ${dbError}`
      );
    });

    it("should handle note not yet complete", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: false,
        completedJobs: 3,
        totalJobs: 10,
      });

      const result = await action.execute(mockInput, mockDeps, mockContext);

      expect(result).toEqual(mockInput);
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[COMPLETION_STATUS] Note test-note-123 not yet complete: 3/10 jobs finished."
      );
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle note completion without getNoteTitle method", async () => {
      const depsWithoutGetNoteTitle = {
        ...mockDeps,
        database: { ...mockDeps.database, getNoteTitle: undefined },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: true,
        completedJobs: 10,
        totalJobs: 10,
      });

      const result = await action.execute(
        mockInput,
        depsWithoutGetNoteTitle,
        mockContext
      );

      expect(result).toEqual(mockInput);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: mockInput.importId,
        noteId: mockInput.noteId,
        status: "COMPLETED",
        message: "Import completed successfully",
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          completedJobs: 10,
          totalJobs: 10,
          noteTitle: null,
        },
      });
    });

    it("should handle getNoteTitle error", async () => {
      const titleError = new Error("Failed to get note title");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.getNoteTitle as any).mockRejectedValue(titleError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: true,
        completedJobs: 10,
        totalJobs: 10,
      });

      const result = await action.execute(mockInput, mockDeps, mockContext);

      expect(result).toEqual(mockInput);
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        `[COMPLETION_STATUS] Error getting note title: ${titleError}`
      );
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: mockInput.importId,
        noteId: mockInput.noteId,
        status: "COMPLETED",
        message: "Import completed successfully",
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          completedJobs: 10,
          totalJobs: 10,
          noteTitle: null,
        },
      });
    });

    it("should handle successful note completion with title", async () => {
      const noteTitle = "Test Recipe";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: true,
        completedJobs: 10,
        totalJobs: 10,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.getNoteTitle as any).mockResolvedValue(noteTitle);

      const result = await action.execute(mockInput, mockDeps, mockContext);

      expect(result).toEqual(mockInput);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: mockInput.importId,
        noteId: mockInput.noteId,
        status: "COMPLETED",
        message: "Import completed successfully",
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          completedJobs: 10,
          totalJobs: 10,
          noteTitle,
        },
      });
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[COMPLETION_STATUS] Successfully broadcast completion for note test-note-123"
      );
    });

    it("should handle broadcast error", async () => {
      const broadcastError = new Error("Broadcast failed");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.addStatusEventAndBroadcast as any).mockRejectedValue(
        broadcastError
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: true,
        completedJobs: 10,
        totalJobs: 10,
      });

      const result = await action.execute(mockInput, mockDeps, mockContext);

      expect(result).toEqual(mockInput);
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        `[COMPLETION_STATUS] Error checking completion status for note ${mockInput.noteId}: ${broadcastError}`
      );
    });

    it("should prevent duplicate broadcasts for the same note", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: true,
        completedJobs: 10,
        totalJobs: 10,
      });

      // First execution should broadcast
      const result1 = await action.execute(mockInput, mockDeps, mockContext);
      expect(result1).toEqual(mockInput);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(1);

      // Second execution should skip broadcast
      const result2 = await action.execute(mockInput, mockDeps, mockContext);
      expect(result2).toEqual(mockInput);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        "[COMPLETION_STATUS] Note test-note-123 already marked as complete, skipping duplicate broadcast"
      );
    });

    it("should handle missing logger dependency", async () => {
      const depsWithoutLogger = {
        ...mockDeps,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: undefined as any,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: true,
        completedJobs: 10,
        totalJobs: 10,
      });

      const result = await action.execute(
        mockInput,
        depsWithoutLogger,
        mockContext
      );

      expect(result).toEqual(mockInput);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalled();
    });

    it("should log debug information correctly", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database!.checkNoteCompletion as any).mockResolvedValue({
        isComplete: false,
        completedJobs: 3,
        totalJobs: 10,
      });

      await action.execute(mockInput, mockDeps, mockContext);

      expect(mockDeps.logger?.log).toHaveBeenCalledWith(
        `[COMPLETION_STATUS] Received input: noteId=${mockInput.noteId}, importId=${mockInput.importId}, currentInstructionIndex=${mockInput.currentInstructionIndex}, totalInstructions=${mockInput.totalInstructions}`
      );
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("completion_status");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });
});

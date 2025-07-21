import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockLogger } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";
import { CompletionStatusAction } from "../../actions/completion-status";
import type { CompletionStatusInput } from "../../actions/types";
import { mockDatabaseService } from "../test-fixtures";

function createDeps(overrides = {}) {
  return {
    logger: mockLogger,
    database: mockDatabaseService,
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    ErrorHandler: { withErrorHandling: vi.fn(async (op) => op()) },
    ...overrides,
  };
}

describe("CompletionStatusAction", () => {
  let action: CompletionStatusAction;
  let deps: ReturnType<typeof createDeps>;
  let input: CompletionStatusInput;

  beforeEach(() => {
    action = new CompletionStatusAction();
    deps = createDeps();
    input = {
      noteId: "note-1",
      instructionLineId: "line-1",
      importId: "import-1",
      currentInstructionIndex: 1,
      totalInstructions: 2,
      success: true,
      parseStatus: "CORRECT",
      stepsSaved: 1,
    };
    vi.clearAllMocks();
    CompletionStatusAction.clearCompletedNotes();
  });

  it("logs and skips if required fields are missing", async () => {
    const missingInput = { ...input, noteId: undefined };
    const context: ActionContext = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: missingInput.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    const result = await action.execute(missingInput, deps, context);
    expect(result).toBe(missingInput);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("missing noteId or importId")
    );
  });

  it("skips if already completed", async () => {
    deps.database.checkNoteCompletion = vi
      .fn()
      .mockResolvedValue({ isComplete: true, completedJobs: 1, totalJobs: 2 });
    const context: ActionContext = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: input.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    await action.execute(input, deps, context);
    // Second call should skip
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("already marked as complete")
    );
  });

  it("logs and skips if checkNoteCompletion is missing", async () => {
    const depsNoCheck = createDeps({
      database: { ...mockDatabaseService, checkNoteCompletion: undefined },
    });
    const context: ActionContext = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: input.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    const result = await action.execute(input, depsNoCheck, context);
    expect(result).toBe(input);
    expect(depsNoCheck.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("checkNoteCompletion method not available")
    );
  });

  it("logs and skips if checkNoteCompletion throws", async () => {
    deps.database.checkNoteCompletion = vi
      .fn()
      .mockRejectedValue(new Error("fail"));
    const context: ActionContext = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: input.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Error checking completion status")
    );
  });

  it("logs not complete if isComplete is false", async () => {
    deps.database.checkNoteCompletion = vi
      .fn()
      .mockResolvedValue({ isComplete: false, completedJobs: 1, totalJobs: 2 });
    const context: ActionContext = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: input.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("not yet complete")
    );
  });

  it("broadcasts and logs if isComplete is true", async () => {
    deps.database.checkNoteCompletion = vi
      .fn()
      .mockResolvedValue({ isComplete: true, completedJobs: 2, totalJobs: 2 });
    deps.database.getNoteTitle = vi.fn().mockResolvedValue("Test Note");
    const context: ActionContext = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: input.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: input.importId,
        noteId: input.noteId,
        status: "COMPLETED",
        message: expect.any(String),
        metadata: expect.objectContaining({
          completedJobs: 2,
          totalJobs: 2,
          noteTitle: "Test Note",
        }),
      })
    );
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Successfully broadcast completion")
    );
  });

  it("handles error in getNoteTitle gracefully", async () => {
    deps.database.checkNoteCompletion = vi
      .fn()
      .mockResolvedValue({ isComplete: true, completedJobs: 2, totalJobs: 2 });
    deps.database.getNoteTitle = vi.fn().mockRejectedValue(new Error("fail"));
    const context: ActionContext = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: input.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Error getting note title")
    );
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
      })
    );
  });
});

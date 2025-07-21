import {
  type MockedFunction,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { CompletionStatusAction } from "../../actions/completion-status";
import type { CompletionStatusInput } from "../../actions/types";
import type { InstructionWorkerDependencies } from "../../types";

interface TestContext {
  jobId: string;
  retryCount: number;
  queueName: string;
  noteId: string;
  operation: string;
  startTime: number;
  workerName: string;
  attemptNumber: number;
}

function createDeps(
  overrides: Partial<InstructionWorkerDependencies> = {}
): InstructionWorkerDependencies {
  return {
    database: {
      updateInstructionLine: vi.fn(),
      createInstructionSteps: vi.fn(),
      checkNoteCompletion: vi.fn().mockResolvedValue({
        isComplete: false,
        completedJobs: 1,
        totalJobs: 2,
      }),
      ...overrides.database,
    },
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    logger: { log: vi.fn() },
    ErrorHandler: {
      withErrorHandling: vi.fn(async (op) => op()),
    },
    ...overrides,
  };
}

describe("CompletionStatusAction (Instruction)", () => {
  let action: CompletionStatusAction;
  let deps: InstructionWorkerDependencies;
  let input: CompletionStatusInput;
  let context: TestContext;

  beforeEach(() => {
    // Clear completed notes between tests
    CompletionStatusAction.clearCompletedNotes();

    action = new CompletionStatusAction();
    deps = createDeps();
    input = {
      noteId: "note-1",
      importId: "import-1",
      instructionLineId: "line-1",
      success: true,
      stepsSaved: 1,
      parseStatus: "CORRECT",
      currentInstructionIndex: 1,
      totalInstructions: 2,
    };
    context = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test",
      noteId: "note-1",
      operation: "test",
      startTime: Date.now(),
      workerName: "worker",
      attemptNumber: 1,
    };
  });

  it("skips if noteId or importId is missing", async () => {
    const missing = { ...input, noteId: undefined };
    const result = await action.execute(missing, deps, context);
    expect(result).toBe(missing);
    expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
  });

  it("skips if already completed", async () => {
    // Mark as completed first
    const checkNoteCompletion = deps.database
      .checkNoteCompletion as MockedFunction<
      NonNullable<typeof deps.database.checkNoteCompletion>
    >;
    checkNoteCompletion.mockResolvedValue({
      isComplete: true,
      completedJobs: 2,
      totalJobs: 2,
    });

    await action.execute(input, deps, context);

    // Should skip on second call
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(1);
  });

  it("logs and skips if checkNoteCompletion is missing", async () => {
    deps = createDeps({
      database: {
        updateInstructionLine: async () => undefined,
        createInstructionSteps: async () => undefined,
      },
    });
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
  });

  it("logs and skips if checkNoteCompletion throws", async () => {
    deps = createDeps({
      database: {
        updateInstructionLine: async () => undefined,
        createInstructionSteps: async () => undefined,
        checkNoteCompletion: vi.fn().mockRejectedValue(new Error("fail")),
      },
    });
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
  });

  it("does not broadcast when not complete", async () => {
    const checkNoteCompletion = deps.database
      .checkNoteCompletion as MockedFunction<
      NonNullable<typeof deps.database.checkNoteCompletion>
    >;
    checkNoteCompletion.mockResolvedValue({
      isComplete: false,
      completedJobs: 1,
      totalJobs: 2,
    });
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
  });

  it("broadcasts COMPLETED if complete", async () => {
    const checkNoteCompletion = deps.database
      .checkNoteCompletion as MockedFunction<
      NonNullable<typeof deps.database.checkNoteCompletion>
    >;
    checkNoteCompletion.mockResolvedValue({
      isComplete: true,
      completedJobs: 2,
      totalJobs: 2,
    });
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: input.importId,
        noteId: input.noteId,
        status: "COMPLETED",
        message: expect.any(String),
        context: expect.any(String),
        metadata: expect.objectContaining({
          completedJobs: 2,
          totalJobs: 2,
        }),
      })
    );
  });

  it("enriches metadata with noteTitle if getNoteTitle is present", async () => {
    const checkNoteCompletion = deps.database
      .checkNoteCompletion as MockedFunction<
      NonNullable<typeof deps.database.checkNoteCompletion>
    >;
    checkNoteCompletion.mockResolvedValue({
      isComplete: true,
      completedJobs: 2,
      totalJobs: 2,
    });

    deps = createDeps({
      database: {
        ...deps.database,
        getNoteTitle: vi.fn().mockResolvedValue("Test Note"),
      },
    });

    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          noteTitle: "Test Note",
        }),
      })
    );
  });

  it("handles error in getNoteTitle gracefully", async () => {
    const checkNoteCompletion = deps.database
      .checkNoteCompletion as MockedFunction<
      NonNullable<typeof deps.database.checkNoteCompletion>
    >;
    checkNoteCompletion.mockResolvedValue({
      isComplete: true,
      completedJobs: 2,
      totalJobs: 2,
    });

    deps = createDeps({
      database: {
        ...deps.database,
        getNoteTitle: vi.fn().mockRejectedValue(new Error("fail")),
      },
    });

    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.not.objectContaining({
          noteTitle: expect.anything(),
        }),
      })
    );
  });

  it("logs error if addStatusEventAndBroadcast throws", async () => {
    const checkNoteCompletion = deps.database
      .checkNoteCompletion as MockedFunction<
      NonNullable<typeof deps.database.checkNoteCompletion>
    >;
    checkNoteCompletion.mockResolvedValue({
      isComplete: true,
      completedJobs: 2,
      totalJobs: 2,
    });

    deps.addStatusEventAndBroadcast = vi
      .fn()
      .mockRejectedValue(new Error("fail"));
    await action.execute(input, deps, context);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining(
        "Error checking completion status for note note-1: Error: fail"
      )
    );
  });
});

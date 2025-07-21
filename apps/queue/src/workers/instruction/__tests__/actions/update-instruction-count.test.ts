import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockLogger } from "../../../__tests__/test-utils";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";
import type {
  UpdateInstructionCountData,
  UpdateInstructionCountDeps,
} from "../../actions/types";
import { UpdateInstructionCountAction } from "../../actions/update-instruction-count";
import { mockDatabaseService } from "../test-fixtures";

function createDeps(): UpdateInstructionCountDeps {
  return {
    logger: mockLogger,
    database: {
      ...mockDatabaseService,
      incrementNoteCompletionTracker: vi.fn().mockResolvedValue(undefined),
    },
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    ErrorHandler: { withErrorHandling: vi.fn(async (op) => op()) },
  };
}

describe("UpdateInstructionCountAction", () => {
  let action: UpdateInstructionCountAction;
  let deps: UpdateInstructionCountDeps;
  let input: UpdateInstructionCountData;
  let context: ActionContext;

  beforeEach(() => {
    action = new UpdateInstructionCountAction();
    deps = createDeps();
    input = {
      importId: "import-1",
      noteId: "note-1",
      currentInstructionIndex: 1,
      totalInstructions: 2,
    };
    context = createMockActionContext({ noteId: input.noteId });
    vi.clearAllMocks();
  });

  it("increments tracker and broadcasts PROCESSING if not complete", async () => {
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.database.incrementNoteCompletionTracker).toHaveBeenCalledWith(
      input.noteId
    );
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Incremented completion tracker for note")
    );
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PROCESSING",
        message: expect.stringContaining("1/2"),
        metadata: expect.objectContaining({
          isComplete: false,
        }),
      })
    );
  });

  it("increments tracker and broadcasts COMPLETED if complete", async () => {
    const complete = { ...input, currentInstructionIndex: 2 };
    const result = await action.execute(complete, deps, context);
    expect(result).toBe(complete);
    expect(deps.database.incrementNoteCompletionTracker).toHaveBeenCalledWith(
      complete.noteId
    );
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
        message: expect.stringContaining("2/2"),
        metadata: expect.objectContaining({
          isComplete: true,
        }),
      })
    );
  });

  it("broadcasts status but does not increment if noteId is missing", async () => {
    const noNote = { ...input, noteId: undefined };
    const result = await action.execute(noNote, deps, context);
    expect(result).toBe(noNote);
    expect(deps.database.incrementNoteCompletionTracker).not.toHaveBeenCalled();
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalled();
  });

  it("logs error if incrementNoteCompletionTracker throws", async () => {
    deps.database.incrementNoteCompletionTracker = vi
      .fn()
      .mockRejectedValue(new Error("fail"));
    await action.execute(input, deps, context);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Failed to update completion tracker for note"),
      "error"
    );
  });

  it("logs error if addStatusEventAndBroadcast throws", async () => {
    deps.addStatusEventAndBroadcast = vi
      .fn()
      .mockRejectedValue(new Error("fail"));
    await action.execute(input, deps, context);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Failed to broadcast status"),
      "error"
    );
  });
});

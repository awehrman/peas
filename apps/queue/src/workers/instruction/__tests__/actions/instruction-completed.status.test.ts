import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionContext } from "../../../core/types";
import { InstructionCompletedStatusAction } from "../../actions/instruction-completed-status";
import type {
  InstructionCompletedStatusData,
  InstructionCompletedStatusDeps,
} from "../../actions/types";

function createDeps(): InstructionCompletedStatusDeps {
  return {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
  };
}

describe("InstructionCompletedStatusAction", () => {
  let action: InstructionCompletedStatusAction;
  let deps: InstructionCompletedStatusDeps;
  let input: InstructionCompletedStatusData;
  let context: ActionContext;

  beforeEach(() => {
    action = new InstructionCompletedStatusAction();
    deps = createDeps();
    input = {
      noteId: "note-1",
      instructionLineId: "line-1",
      originalText: "text",
      lineIndex: 0,
      importId: "import-1",
      currentInstructionIndex: 1,
      totalInstructions: 2,
      parseStatus: "CORRECT",
      success: true,
      stepsSaved: 1,
    };
    context = {
      jobId: "job-1",
      retryCount: 0,
      queueName: "test-queue",
      noteId: input.noteId,
      operation: "test_operation",
      startTime: Date.now(),
      workerName: "test_worker",
      attemptNumber: 1,
    };
    vi.clearAllMocks();
  });

  it("skips if tracking info is missing", async () => {
    const missing = { ...input, importId: undefined };
    const result = await action.execute(missing, deps, context);
    expect(result).toBe(missing);
    expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
  });

  it("broadcasts PROCESSING status if not complete", async () => {
    const result = await action.execute(input, deps, context);
    expect(result).toBe(input);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: input.importId,
        noteId: input.noteId,
        status: "PROCESSING",
        message: expect.stringContaining("1/2"),
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: expect.objectContaining({
          totalInstructions: 2,
          processedInstructions: 1,
          instructionLineId: input.instructionLineId,
          parseStatus: input.parseStatus,
          isComplete: false,
        }),
      })
    );
  });

  it("broadcasts COMPLETED status if complete", async () => {
    const complete = { ...input, currentInstructionIndex: 2 };
    const result = await action.execute(complete, deps, context);
    expect(result).toBe(complete);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: complete.importId,
        noteId: complete.noteId,
        status: "COMPLETED",
        message: expect.stringContaining("2/2"),
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: expect.objectContaining({
          totalInstructions: 2,
          processedInstructions: 2,
          instructionLineId: complete.instructionLineId,
          parseStatus: complete.parseStatus,
          isComplete: true,
        }),
      })
    );
  });

  it("handles missing parseStatus in metadata", async () => {
    const noParseStatus = { ...input, parseStatus: undefined };
    const result = await action.execute(noParseStatus, deps, context);
    expect(result).toBe(noParseStatus);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          parseStatus: "UNKNOWN",
        }),
      })
    );
  });
});

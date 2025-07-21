import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockLogger } from "../../../__tests__/test-utils";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";
import { SaveInstructionLineAction } from "../../actions/save-instruction-line";
import type { SaveInstructionLineInput } from "../../actions/types";
import type { InstructionWorkerDependencies } from "../../types";
import { mockDatabaseService } from "../test-fixtures";

function createDeps(): InstructionWorkerDependencies {
  return {
    logger: mockLogger,
    database: mockDatabaseService,
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    ErrorHandler: { withErrorHandling: vi.fn(async (op) => op()) },
  };
}

describe("SaveInstructionLineAction", () => {
  let action: SaveInstructionLineAction;
  let deps: InstructionWorkerDependencies;
  let input: SaveInstructionLineInput;
  let context: ActionContext;

  beforeEach(() => {
    action = new SaveInstructionLineAction();
    deps = createDeps();
    input = {
      noteId: "note-1",
      instructionLineId: "line-1",
      originalText: "Mix flour and water",
      lineIndex: 0,
      importId: "import-1",
      currentInstructionIndex: 1,
      totalInstructions: 2,
      success: true,
      parseStatus: "CORRECT",
      steps: [
        { stepNumber: 1, action: "Mix" },
        { stepNumber: 2, action: "Bake" },
      ],
    };
    context = createMockActionContext({ noteId: input.noteId });
    vi.clearAllMocks();
  });

  it("logs and returns correct result for normal save", async () => {
    const result = await action.execute(input, deps, context);
    expect(result).toEqual({
      success: true,
      stepsSaved: 2,
      parseStatus: "CORRECT",
      importId: input.importId,
      noteId: input.noteId,
      currentInstructionIndex: input.currentInstructionIndex,
      totalInstructions: input.totalInstructions,
      instructionLineId: input.instructionLineId,
    });
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Saving instruction line data for note")
    );
  });

  it("returns stepsSaved as 0 if steps is missing", async () => {
    const noSteps = { ...input, steps: undefined };
    const result = await action.execute(noSteps, deps, context);
    expect(result.stepsSaved).toBe(0);
  });

  it("throws and logs error if logSave throws", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(action as any, "logSave").mockImplementation(() => {
      throw new Error("Test log error");
    });
    await expect(action.execute(input, deps, context)).rejects.toThrow(
      /Failed to save instruction line: Test log error/
    );
  });

  it("falls back to console.log when logger is not available", async () => {
    const depsWithoutLogger = {
      ...deps,
      logger: undefined,
    } as InstructionWorkerDependencies & { logger: undefined };
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await action.execute(input, depsWithoutLogger, context);

    expect(result).toEqual({
      success: true,
      stepsSaved: 2,
      parseStatus: "CORRECT",
      importId: input.importId,
      noteId: input.noteId,
      currentInstructionIndex: input.currentInstructionIndex,
      totalInstructions: input.totalInstructions,
      instructionLineId: input.instructionLineId,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      `Saving instruction line data for note ${input.noteId}:`,
      {
        instructionLineId: input.instructionLineId,
        parseStatus: input.parseStatus,
        normalizedText: undefined,
        stepsCount: 2,
      }
    );

    consoleSpy.mockRestore();
  });
});

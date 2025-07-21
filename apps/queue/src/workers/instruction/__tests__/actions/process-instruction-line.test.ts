import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockLogger } from "../../../__tests__/test-utils";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";
import * as errorBroadcasting from "../../../shared/error-broadcasting";
import { ProcessInstructionLineAction } from "../../actions/process-instruction-line";
import type { ProcessInstructionLineInput } from "../../actions/types";
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

describe("ProcessInstructionLineAction", () => {
  let action: ProcessInstructionLineAction;
  let deps: InstructionWorkerDependencies;
  let input: ProcessInstructionLineInput;
  let context: ActionContext;
  let broadcastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new ProcessInstructionLineAction();
    deps = createDeps();
    input = {
      noteId: "note-1",
      instructionLineId: "line-1",
      originalText: "Mix flour and water",
      lineIndex: 0,
      importId: "import-1",
      currentInstructionIndex: 1,
      totalInstructions: 2,
    };
    context = createMockActionContext({ noteId: input.noteId });
    vi.clearAllMocks();
    // @ts-expect-error Vitest/TypeScript false positive for imported function spy
    broadcastSpy = vi
      .spyOn(errorBroadcasting, "broadcastParsingError")
      .mockResolvedValue();
  });

  afterEach(() => {
    broadcastSpy.mockRestore();
  });

  it("processes and normalizes valid instruction text", async () => {
    const result = await action.execute(input, deps, context);
    expect(result.success).toBe(true);
    expect(result.parseStatus).toBe("CORRECT");
    expect(result.normalizedText).toBe("Mix flour and water.");
    expect(broadcastSpy).not.toHaveBeenCalled();
  });

  it("removes ALL CAPS prefix and ensures punctuation", async () => {
    const inputWithCaps: ProcessInstructionLineInput = {
      ...input,
      originalText: "PREHEAT OVEN: to 350F",
    };
    const result = await action.execute(inputWithCaps, deps, context);
    expect(result.normalizedText).toBe("to 350F.");
  });

  it("returns ERROR and broadcasts parse error for short/invalid text", async () => {
    const shortInput: ProcessInstructionLineInput = {
      ...input,
      originalText: "Hi",
    };
    const result = await action.execute(shortInput, deps, context);
    expect(result.success).toBe(false);
    expect(result.parseStatus).toBe("ERROR");
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: deps.logger,
        addStatusEventAndBroadcast: deps.addStatusEventAndBroadcast,
      }),
      expect.objectContaining({
        importId: shortInput.importId,
        noteId: shortInput.noteId,
        lineId: shortInput.instructionLineId,
        reference: shortInput.originalText,
        errorMessage: expect.stringContaining("Instruction parsing failed"),
        context: expect.any(String),
      })
    );
  });

  it("handles and broadcasts processing error if an exception is thrown", async () => {
    // Force an error in processInstructionText
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(action as any, "processInstructionText").mockImplementation(() => {
      throw new Error("Test error");
    });
    const result = await action.execute(input, deps, context);
    expect(result.success).toBe(false);
    expect(result.parseStatus).toBe("ERROR");
    expect(result.errorMessage).toBe("Test error");
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: deps.logger,
        addStatusEventAndBroadcast: deps.addStatusEventAndBroadcast,
      }),
      expect.objectContaining({
        importId: input.importId,
        noteId: input.noteId,
        lineId: input.instructionLineId,
        reference: input.originalText,
        errorMessage: expect.stringContaining("Processing error: Test error"),
        context: expect.any(String),
      })
    );
  });

  it("logs processing start", async () => {
    await action.execute(input, deps, context);
    expect(deps.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Processing instruction line for note")
    );
  });
});

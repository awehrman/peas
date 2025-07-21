import { describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { BaseAction } from "../../core/base-action";
import type { ActionContext } from "../../core/types";
import {
  InstructionPipelineContext,
  createInstructionPipeline,
} from "../pipeline";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "../types";

describe("createInstructionPipeline", () => {
  const makeMockAction = (
    name: string
  ): BaseAction<InstructionJobData, InstructionJobData> =>
    ({
      name,
      execute: vi.fn(),
      executeWithTiming: vi.fn(),
      withConfig: vi.fn(function (
        this: BaseAction<InstructionJobData, InstructionJobData>
      ) {
        return this;
      }),
    }) as BaseAction<InstructionJobData, InstructionJobData>;
  const mockDeps = {} as InstructionWorkerDependencies;
  const baseCtx: InstructionPipelineContext = {
    addStatusActions: vi.fn(),
    createWrappedAction: vi.fn((actionName) => makeMockAction(actionName)),
    createErrorHandledAction: vi.fn((actionName) => makeMockAction(actionName)),
    dependencies: mockDeps,
  };
  const baseData: InstructionJobData = {
    instructionLineId: "id",
    originalText: "text",
    lineIndex: 0,
    noteId: "note",
  };
  const mockContext = {} as ActionContext;

  it("adds status actions and all core actions", () => {
    const ctx = { ...baseCtx, addStatusActions: vi.fn() };
    const data = { ...baseData };
    const actions = createInstructionPipeline(ctx, data, mockContext);
    expect(ctx.addStatusActions).toHaveBeenCalledWith(expect.any(Array), data);
    expect(actions.map((a) => a.name)).toEqual([
      ActionName.PROCESS_INSTRUCTION_LINE,
      ActionName.SAVE_INSTRUCTION_LINE,
      ActionName.COMPLETION_STATUS,
    ]);
  });

  it("includes UPDATE_INSTRUCTION_COUNT if tracking info present", () => {
    const ctx = { ...baseCtx };
    const data = {
      ...baseData,
      importId: "import",
      currentInstructionIndex: 1,
      totalInstructions: 2,
    };
    const actions = createInstructionPipeline(ctx, data, mockContext);
    expect(actions.map((a) => a.name)).toContain(
      ActionName.UPDATE_INSTRUCTION_COUNT
    );
  });

  it("does not include UPDATE_INSTRUCTION_COUNT if tracking info missing", () => {
    const ctx = { ...baseCtx };
    const data = { ...baseData, importId: "import" };
    const actions = createInstructionPipeline(ctx, data, mockContext);
    expect(actions.map((a) => a.name)).not.toContain(
      ActionName.UPDATE_INSTRUCTION_COUNT
    );
  });

  it("calls createWrappedAction and createErrorHandledAction with correct args", () => {
    const ctx = { ...baseCtx };
    const data = {
      ...baseData,
      importId: "import",
      currentInstructionIndex: 1,
      totalInstructions: 2,
    };
    createInstructionPipeline(ctx, data, mockContext);
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.UPDATE_INSTRUCTION_COUNT,
      ctx.dependencies
    );
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.PROCESS_INSTRUCTION_LINE,
      ctx.dependencies
    );
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.SAVE_INSTRUCTION_LINE,
      ctx.dependencies
    );
    expect(ctx.createErrorHandledAction).toHaveBeenCalledWith(
      ActionName.COMPLETION_STATUS,
      ctx.dependencies
    );
  });
});

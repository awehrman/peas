import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { BaseAction } from "../../core/base-action";
import type { IngredientPipelineContext } from "../pipeline";
import { createIngredientPipeline } from "../pipeline";
import type { IngredientJobData, IngredientWorkerDependencies } from "../types";

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

function makeMockAction(
  name: string
): BaseAction<IngredientJobData, IngredientJobData> {
  return {
    name,
    execute: vi.fn(),
    executeWithTiming: vi.fn(),
    withConfig: vi.fn(),
  } as unknown as BaseAction<IngredientJobData, IngredientJobData>;
}

describe("createIngredientPipeline", () => {
  let ctx: IngredientPipelineContext;
  let data: IngredientJobData;
  let context: TestContext;

  beforeEach(() => {
    ctx = {
      addStatusActions: vi.fn(),
      createWrappedAction: vi.fn((actionName) => makeMockAction(actionName)),
      createErrorHandledAction: vi.fn((actionName) =>
        makeMockAction(actionName)
      ),
      dependencies: {} as IngredientWorkerDependencies,
    };
    data = {
      ingredientLineId: "id",
      reference: "2 cups flour",
      blockIndex: 0,
      lineIndex: 0,
      noteId: "note-1",
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

  it("calls addStatusActions and adds all core actions", () => {
    const actions = createIngredientPipeline(ctx, data, context);
    expect(ctx.addStatusActions).toHaveBeenCalledWith(expect.any(Array), data);
    expect(
      (actions as BaseAction<IngredientJobData, IngredientJobData>[]).map(
        (a) => a.name
      )
    ).toEqual([
      ActionName.PROCESS_INGREDIENT_LINE,
      ActionName.SAVE_INGREDIENT_LINE,
      ActionName.TRACK_PATTERN,
      ActionName.COMPLETION_STATUS,
      ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION,
    ]);
  });

  it("adds UPDATE_INGREDIENT_COUNT if tracking info present", () => {
    data.importId = "import";
    data.currentIngredientIndex = 1;
    data.totalIngredients = 2;
    const actions = createIngredientPipeline(ctx, data, context);
    expect(
      (actions as BaseAction<IngredientJobData, IngredientJobData>[]).map(
        (a) => a.name
      )
    ).toContain(ActionName.UPDATE_INGREDIENT_COUNT);
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.UPDATE_INGREDIENT_COUNT,
      ctx.dependencies
    );
  });

  it("does not add UPDATE_INGREDIENT_COUNT if tracking info missing", () => {
    const actions = createIngredientPipeline(ctx, data, context);
    expect(
      (actions as BaseAction<IngredientJobData, IngredientJobData>[]).map(
        (a) => a.name
      )
    ).not.toContain(ActionName.UPDATE_INGREDIENT_COUNT);
  });

  it("calls createWrappedAction and createErrorHandledAction with correct args", () => {
    data.importId = "import";
    data.currentIngredientIndex = 1;
    data.totalIngredients = 2;
    createIngredientPipeline(ctx, data, context);
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.UPDATE_INGREDIENT_COUNT,
      ctx.dependencies
    );
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.PROCESS_INGREDIENT_LINE,
      ctx.dependencies
    );
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.SAVE_INGREDIENT_LINE,
      ctx.dependencies
    );
    expect(ctx.createWrappedAction).toHaveBeenCalledWith(
      ActionName.TRACK_PATTERN,
      ctx.dependencies
    );
    expect(ctx.createErrorHandledAction).toHaveBeenCalledWith(
      ActionName.COMPLETION_STATUS,
      ctx.dependencies
    );
    expect(ctx.createErrorHandledAction).toHaveBeenCalledWith(
      ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION,
      ctx.dependencies
    );
  });

  it("returns actions in the correct order", () => {
    data.importId = "import";
    data.currentIngredientIndex = 1;
    data.totalIngredients = 2;
    const actions = createIngredientPipeline(ctx, data, context);
    expect(
      (actions as BaseAction<IngredientJobData, IngredientJobData>[]).map(
        (a) => a.name
      )
    ).toEqual([
      ActionName.UPDATE_INGREDIENT_COUNT,
      ActionName.PROCESS_INGREDIENT_LINE,
      ActionName.SAVE_INGREDIENT_LINE,
      ActionName.TRACK_PATTERN,
      ActionName.COMPLETION_STATUS,
      ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION,
    ]);
  });
});

import type { IngredientJobData, IngredientWorkerDependencies } from "./types";

import { ActionName } from "../../types";
import type { BaseAction } from "../core/base-action";
import type { ActionContext } from "../core/types";

/**
 * Context object for building the ingredient processing pipeline.
 * Provides helpers and dependencies for action creation and status management.
 */
export interface IngredientPipelineContext {
  addStatusActions: (
    actions: BaseAction<IngredientJobData, IngredientJobData>[],
    data: IngredientJobData
  ) => void;
  createWrappedAction: (
    actionName: ActionName,
    dependencies?: IngredientWorkerDependencies
  ) => BaseAction<IngredientJobData, IngredientJobData>;
  createErrorHandledAction: (
    actionName: ActionName,
    dependencies?: IngredientWorkerDependencies
  ) => BaseAction<IngredientJobData, IngredientJobData>;
  dependencies: IngredientWorkerDependencies;
}

/**
 * Creates the action pipeline for processing an ingredient job.
 *
 * @param ctx - The pipeline context with helpers and dependencies.
 * @param data - The job data for the ingredient line.
 * @param _context - The action context (unused).
 * @returns An array of actions to execute for the ingredient job.
 */
export function createIngredientPipeline(
  ctx: IngredientPipelineContext,
  data: IngredientJobData,
  _context: ActionContext
): BaseAction<IngredientJobData, IngredientJobData>[] {
  const actions: BaseAction<IngredientJobData, IngredientJobData>[] = [];

  // Add standard status actions if we have a noteId
  ctx.addStatusActions(actions, data);

  // Add ingredient count update if we have tracking information
  if (
    data.importId &&
    typeof data.currentIngredientIndex === "number" &&
    typeof data.totalIngredients === "number"
  ) {
    actions.push(
      ctx.createWrappedAction(
        ActionName.UPDATE_INGREDIENT_COUNT,
        ctx.dependencies
      )
    );
  }

  // 1. Process ingredient line (with retry and error handling)
  actions.push(
    ctx.createWrappedAction(
      ActionName.PROCESS_INGREDIENT_LINE,
      ctx.dependencies
    )
  );

  // 2. Save ingredient line (with retry and error handling)
  actions.push(
    ctx.createWrappedAction(ActionName.SAVE_INGREDIENT_LINE, ctx.dependencies)
  );

  // 3. Track unique line pattern (low priority, non-blocking)
  actions.push(
    ctx.createWrappedAction(ActionName.TRACK_PATTERN, ctx.dependencies)
  );

  // 4. Check completion status and broadcast if all jobs are done
  actions.push(
    ctx.createErrorHandledAction(ActionName.COMPLETION_STATUS, ctx.dependencies)
  );

  // 5. Schedule categorization after completion
  actions.push(
    ctx.createErrorHandledAction(
      ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION,
      ctx.dependencies
    )
  );

  return actions;
}

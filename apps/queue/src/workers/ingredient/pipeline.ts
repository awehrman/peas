import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "./dependencies";

import { ActionName } from "../../types";
import type { ActionFactory } from "../core/action-factory";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * Creates the action pipeline for ingredient processing using the factory approach.
 * @param actionFactory - The action factory to create actions
 * @param dependencies - Worker dependencies
 * @param data - Job data to determine conditional actions
 * @param context - Action context
 * @returns Array of ingredient pipeline actions
 */
export function createIngredientPipeline(
  actionFactory: ActionFactory<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >,
  dependencies: IngredientWorkerDependencies,
  data: IngredientJobData,
  _context: ActionContext
): WorkerAction<
  IngredientJobData,
  IngredientWorkerDependencies,
  IngredientJobData
>[] {
  const actions: WorkerAction<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >[] = [];

  // Check if this is a completion check job (no ingredientReference)
  const isCompletionCheckJob = !data.ingredientReference;

  if (isCompletionCheckJob) {
    // For completion check jobs, only run the completion check action
    actions.push(
      actionFactory.create(ActionName.CHECK_INGREDIENT_COMPLETION, dependencies)
    );
  } else {
    // For regular ingredient jobs, run parse and save
    actions.push(
      actionFactory.create(ActionName.PARSE_INGREDIENT_LINE, dependencies)
    );
    actions.push(
      actionFactory.create(ActionName.SAVE_INGREDIENT_LINE, dependencies)
    );
  }

  return actions;
}

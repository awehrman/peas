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
  _data: IngredientJobData,
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

  // Always start with parse ingredient
  actions.push(
    actionFactory.create(ActionName.PARSE_INGREDIENT_LINE, dependencies)
  );

  // Always save the parsed ingredient
  actions.push(
    actionFactory.create(ActionName.SAVE_INGREDIENT_LINE, dependencies)
  );

  return actions;
}

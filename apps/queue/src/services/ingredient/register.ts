import { ActionName } from "../../types";
import { ActionFactory } from "../../workers/core/action-factory";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../workers/ingredient/dependencies";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

import { CheckIngredientCompletionAction } from "./actions/check-completion/action";
import { ParseIngredientLineAction } from "./actions/parse-ingredient-line/action";
import { SaveIngredientLineAction } from "./actions/save-ingredient-line/action";
import { ScheduleCategorizationAction } from "./actions/schedule-categorization/action";

/**
 * Register all ingredient actions in the given ActionFactory with type safety
 */
export function registerIngredientActions(
  factory: ActionFactory<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >
): void {
  if (!factory || typeof factory !== "object") {
    throw new Error("Invalid factory");
  }
  registerActions(factory, [
    createActionRegistration<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >(ActionName.PARSE_INGREDIENT_LINE, ParseIngredientLineAction),
    createActionRegistration<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >(ActionName.SAVE_INGREDIENT_LINE, SaveIngredientLineAction),
    createActionRegistration<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >(ActionName.CHECK_INGREDIENT_COMPLETION, CheckIngredientCompletionAction),
    createActionRegistration<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >(ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION, ScheduleCategorizationAction),
  ]);
}

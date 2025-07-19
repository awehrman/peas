export { ProcessIngredientLineAction } from "./process-ingredient-line";
export { SaveIngredientLineAction } from "./save-ingredient-line";
export { ProcessIngredientsAction } from "./process-ingredients";
export { ScheduleCategorizationAfterCompletionAction } from "./schedule-categorization-after-completion";
export { UpdateIngredientCountAction } from "./update-ingredient-count";
export { TrackPatternAction } from "./track-pattern";

import { ActionFactory } from "../../core/action-factory";
import { ProcessIngredientLineAction } from "./process-ingredient-line";
import { SaveIngredientLineAction } from "./save-ingredient-line";
import { ProcessIngredientsAction } from "./process-ingredients";
import { ScheduleCategorizationAfterCompletionAction } from "./schedule-categorization-after-completion";
import { UpdateIngredientCountAction } from "./update-ingredient-count";
import { TrackPatternAction } from "./track-pattern";
import {
  registerActions,
  createActionRegistration,
} from "../../shared/action-registry";

/**
 * Register all ingredient actions in the given ActionFactory
 */
export function registerIngredientActions(factory: ActionFactory): void {
  registerActions(factory, [
    createActionRegistration(
      "process_ingredient_line",
      ProcessIngredientLineAction
    ),
    createActionRegistration("save_ingredient_line", SaveIngredientLineAction),
    createActionRegistration("process_ingredients", ProcessIngredientsAction),
    createActionRegistration(
      "schedule_categorization_after_completion",
      ScheduleCategorizationAfterCompletionAction
    ),
    createActionRegistration(
      "update_ingredient_count",
      UpdateIngredientCountAction
    ),
    createActionRegistration("track_pattern", TrackPatternAction),
  ]);
}

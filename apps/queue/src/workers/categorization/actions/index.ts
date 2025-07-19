export { ProcessCategorizationAction } from "./process-categorization";
export { SaveCategorizationAction } from "./save-categorization";

import { ActionFactory } from "../../core/action-factory";
import { ProcessCategorizationAction } from "./process-categorization";
import { SaveCategorizationAction } from "./save-categorization";
import {
  registerActions,
  createActionRegistration,
} from "../../shared/action-registry";

/**
 * Register all categorization actions in the given ActionFactory
 */
export function registerCategorizationActions(factory: ActionFactory): void {
  registerActions(factory, [
    createActionRegistration(
      "process_categorization",
      ProcessCategorizationAction
    ),
    createActionRegistration("save_categorization", SaveCategorizationAction),
  ]);
}

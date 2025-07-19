export { ProcessSourceAction } from "./process-source";
export { SaveSourceAction } from "./save-source";
export { AddProcessingStatusAction } from "./add-processing-status";
export { AddCompletedStatusAction } from "./add-completed-status";

import { ActionFactory } from "../../core/action-factory";
import { ProcessSourceAction } from "./process-source";
import { SaveSourceAction } from "./save-source";
import { AddProcessingStatusAction } from "./add-processing-status";
import { AddCompletedStatusAction } from "./add-completed-status";
import {
  registerActions,
  createActionRegistration,
} from "../../shared/action-registry";

/**
 * Register all source actions in the given ActionFactory
 */
export function registerSourceActions(factory: ActionFactory): void {
  registerActions(factory, [
    createActionRegistration("process_source", ProcessSourceAction),
    createActionRegistration("save_source", SaveSourceAction),
    createActionRegistration(
      "source_processing_status",
      AddProcessingStatusAction
    ),
    createActionRegistration(
      "source_completed_status",
      AddCompletedStatusAction
    ),
  ]);
}

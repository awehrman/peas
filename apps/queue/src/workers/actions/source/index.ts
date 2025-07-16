export * from "./process-source";
export * from "./save-source";
export * from "./add-processing-status";
export * from "./add-completed-status";
export * from "./types";

import { ActionFactory } from "../core/action-factory";
import { ProcessSourceAction } from "./process-source";
import { SaveSourceAction } from "./save-source";
import { AddProcessingStatusAction } from "./add-processing-status";
import { AddCompletedStatusAction } from "./add-completed-status";

/**
 * Register all source actions in the given ActionFactory
 */
export function registerSourceActions(factory: ActionFactory) {
  factory.register("process_source", () => new ProcessSourceAction());
  factory.register("save_source", () => new SaveSourceAction());
  factory.register(
    "add_processing_status",
    () => new AddProcessingStatusAction()
  );
  factory.register(
    "add_completed_status",
    () => new AddCompletedStatusAction()
  );
}

export { ProcessImageAction } from "./process-image";
export { SaveImageAction } from "./save-image";

import { ActionFactory } from "../../core/action-factory";
import { ProcessImageAction } from "./process-image";
import { SaveImageAction } from "./save-image";
import {
  registerActions,
  createActionRegistration,
} from "../../shared/action-registry";

/**
 * Register all image actions in the given ActionFactory
 */
export function registerImageActions(factory: ActionFactory): void {
  registerActions(factory, [
    createActionRegistration("process_image", ProcessImageAction),
    createActionRegistration("save_image", SaveImageAction),
  ]);
}

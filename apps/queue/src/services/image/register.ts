import { ActionName } from "../../types";
import { ActionFactory } from "../../workers/core/action-factory";
import type {
  ImageProcessingData,
  ImageSaveData,
  ImageWorkerDependencies,
} from "../../workers/image/types";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

import { ProcessImageAction } from "./actions/process-image/action";
import { SaveImageAction } from "./actions/save-image/action";
import { ImageCompletedStatusAction } from "./actions/image-completed-status/action";

/**
 * Register all image actions in the given ActionFactory with type safety
 */
export function registerImageActions(
  factory: ActionFactory<
    ImageProcessingData | ImageSaveData,
    ImageWorkerDependencies,
    ImageSaveData
  >
): void {
  if (!factory || typeof factory !== "object") {
    throw new Error("Invalid factory");
  }
  registerActions(factory, [
    createActionRegistration<
      ImageProcessingData,
      ImageWorkerDependencies,
      ImageSaveData
    >(ActionName.PROCESS_IMAGE, ProcessImageAction),
    createActionRegistration<
      ImageSaveData,
      ImageWorkerDependencies,
      ImageSaveData
    >(ActionName.SAVE_IMAGE, SaveImageAction),
    createActionRegistration<
      ImageSaveData,
      ImageWorkerDependencies,
      ImageSaveData
    >(ActionName.IMAGE_COMPLETED_STATUS, ImageCompletedStatusAction),
  ]);
} 
import { ActionName } from "../../types";
import { ActionFactory } from "../../workers/core/action-factory";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../workers/image/types";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

import { CheckImageCompletionAction } from "./actions/check-completion/action";
import { CleanupLocalFilesAction } from "./actions/cleanup-local-files/action";
import { ImageCompletedStatusAction } from "./actions/image-completed-status/action";
import { ProcessImageAction } from "./actions/process-image/action";
import { SaveImageAction } from "./actions/save-image/action";
import { UploadOriginalAction } from "./actions/upload-original/action";
import { UploadProcessedAction } from "./actions/upload-processed/action";

/**
 * Register all image actions in the given ActionFactory with type safety
 */
export function registerImageActions(
  factory: ActionFactory<ImageJobData, ImageWorkerDependencies, ImageJobData>
): void {
  console.log("[IMAGE_SERVICE_REGISTER] Starting image action registration");
  console.log("[IMAGE_SERVICE_REGISTER] Factory available:", !!factory);

  if (!factory || typeof factory !== "object") {
    console.error("[IMAGE_SERVICE_REGISTER] Invalid factory provided");
    throw new Error("Invalid factory");
  }

  console.log("[IMAGE_SERVICE_REGISTER] Registering actions with factory");

  registerActions(factory, [
    createActionRegistration<
      ImageJobData,
      ImageWorkerDependencies,
      ImageJobData
    >(ActionName.UPLOAD_ORIGINAL, UploadOriginalAction),
    createActionRegistration<
      ImageJobData,
      ImageWorkerDependencies,
      ImageJobData
    >(ActionName.PROCESS_IMAGE, ProcessImageAction),
    createActionRegistration<
      ImageJobData,
      ImageWorkerDependencies,
      ImageJobData
    >(ActionName.UPLOAD_PROCESSED, UploadProcessedAction),
    createActionRegistration<
      ImageJobData,
      ImageWorkerDependencies,
      ImageJobData
    >(ActionName.SAVE_IMAGE, SaveImageAction),
    createActionRegistration<
      ImageJobData,
      ImageWorkerDependencies,
      ImageJobData
    >(ActionName.CLEANUP_LOCAL_FILES, CleanupLocalFilesAction),
    createActionRegistration<
      ImageJobData,
      ImageWorkerDependencies,
      ImageJobData
    >(ActionName.IMAGE_COMPLETED_STATUS, ImageCompletedStatusAction),
    createActionRegistration<
      ImageJobData,
      ImageWorkerDependencies,
      ImageJobData
    >(ActionName.CHECK_IMAGE_COMPLETION, CheckImageCompletionAction),
  ]);

  console.log("[IMAGE_SERVICE_REGISTER] Image actions registered successfully");
}

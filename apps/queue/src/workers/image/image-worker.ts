import { Queue } from "bullmq";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../core/base-worker";
import { ActionContext } from "../core/types";
import { registerImageActions } from "./actions";
import { IServiceContainer } from "../../services/container";
import { WORKER_CONSTANTS, LOG_MESSAGES } from "../../config/constants";
import { formatLogMessage, measureExecutionTime } from "../../utils";
import type {
  ImageWorkerDependencies,
  ImageJobData,
  ImageData,
  ProcessedImageResult,
} from "./types";
import type { BaseAction } from "../core/base-action";

// Using imported types from ./types.ts

/**
 * Image Worker that extends BaseWorker for image processing
 */
export class ImageWorker extends BaseWorker<
  ImageJobData,
  ImageWorkerDependencies
> {
  protected registerActions(): void {
    registerImageActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return WORKER_CONSTANTS.NAMES.IMAGE;
  }

  protected createActionPipeline(
    data: ImageJobData,
    _context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

    // Add standard status actions if we have a noteId
    this.addStatusActions(actions, data);

    // 1. Process image (with retry and error handling)
    actions.push(this.createWrappedAction("process_image", this.dependencies));

    // 2. Save image (with retry and error handling)
    actions.push(this.createWrappedAction("save_image", this.dependencies));

    return actions;
  }
}

/**
 * Factory function to create an image worker with dependencies from the service container
 */
export function createImageWorker(
  queue: Queue,
  container: IServiceContainer
): ImageWorker {
  const dependencies: ImageWorkerDependencies = {
    // Base dependencies from helper methods
    ...createBaseDependenciesFromContainer(container),

    // Image-specific dependencies
    imageProcessor: {
      processImage: async (data: ImageData) => {
        const { result } = await measureExecutionTime(async () => {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.IMAGE_PROCESSING_START, {
              noteId: data.noteId || "unknown",
            })
          );

          // TODO: Implement actual image processing
          const result: ProcessedImageResult = {
            success: true,
            processedUrl: "processed-image-url",
            imageMetadata: {
              width: 800,
              height: 600,
              format: "jpeg",
              size: 1024,
            },
            processingTime: 100,
          };

          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.IMAGE_PROCESSING_COMPLETED, {
              processedUrl: result.processedUrl,
              width: result.imageMetadata.width,
              height: result.imageMetadata.height,
            })
          );

          return result;
        }, "image_processing");

        return result;
      },
      saveImage: async (result: ProcessedImageResult) => {
        const { result: savedUrl } = await measureExecutionTime(async () => {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.IMAGE_SAVING_START, {
              processedUrl: result.processedUrl,
            })
          );

          // TODO: Implement actual image saving
          const savedUrl = "saved-image-url";

          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.IMAGE_SAVED, {
              savedUrl,
            })
          );

          return savedUrl;
        }, "image_saving");

        return savedUrl;
      },
    },
    database: {
      updateNoteImage: async (noteId: string, imageUrl: string) => {
        const { result } = await measureExecutionTime(async () => {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.IMAGE_DATABASE_UPDATE, {
              noteId,
              imageUrl,
            })
          );

          // TODO: Implement actual database update
          const result = { noteId, imageUrl };

          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.IMAGE_DATABASE_UPDATED, {
              noteId,
            })
          );

          return result;
        }, "image_database_update");

        return result;
      },
    },
  };

  return new ImageWorker(queue, dependencies);
}

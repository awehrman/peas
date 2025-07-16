import { Queue } from "bullmq";
import { BaseWorker } from "./core/base-worker";
import { ActionContext } from "./actions/core/types";
import { ProcessImageAction, SaveImageAction } from "./actions/image";
import { IServiceContainer } from "../services/container";
import type {
  ImageWorkerDependencies,
  ImageJobData,
  ActionPipeline,
  ProcessedImageResult,
} from "./types";

// Using imported types from ./types.ts

/**
 * Image Worker that extends BaseWorker for image processing
 */
export class ImageWorker extends BaseWorker<
  ImageJobData,
  ImageWorkerDependencies
> {
  protected registerActions(): void {
    // Register image actions
    this.actionFactory.register(
      "process_image",
      () => new ProcessImageAction()
    );
    this.actionFactory.register("save_image", () => new SaveImageAction());
  }

  protected getOperationName(): string {
    return "image_processing";
  }

  protected createActionPipeline(
    data: ImageJobData,
    _context: ActionContext
  ): ActionPipeline<ImageJobData, ProcessedImageResult> {
    const actions: ActionPipeline<ImageJobData, ProcessedImageResult> = [];

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
    // Base dependencies
    addStatusEventAndBroadcast:
      container.statusBroadcaster?.addStatusEventAndBroadcast ||
      (() => Promise.resolve()),
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,

    // Image-specific dependencies
    imageProcessor: {
      processImage: async (data: any) => {
        container.logger.log(
          `[IMAGE] Processing image for note ${data.noteId || "unknown"}`
        );
        // TODO: Implement actual image processing
        const result = {
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
          `[IMAGE] Image processing completed: ${result.processedUrl} (${result.imageMetadata.width}x${result.imageMetadata.height})`
        );
        return result;
      },
      saveImage: async (result: any) => {
        container.logger.log(
          `[IMAGE] Saving processed image: ${result.processedUrl}`
        );
        // TODO: Implement actual image saving
        const savedUrl = "saved-image-url";
        container.logger.log(`[IMAGE] Image saved successfully: ${savedUrl}`);
        return savedUrl;
      },
    },
    database: {
      updateNoteImage: async (noteId: string, imageUrl: string) => {
        container.logger.log(
          `[IMAGE] Updating note ${noteId} with image URL: ${imageUrl}`
        );
        // TODO: Implement actual database update
        const result = { noteId, imageUrl };
        container.logger.log(
          `[IMAGE] Successfully updated note ${noteId} with image`
        );
        return result;
      },
    },
  };

  return new ImageWorker(queue, dependencies);
}

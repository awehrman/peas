import { Queue } from "bullmq";
import {
  BaseWorker,
  BaseWorkerDependencies,
  BaseJobData,
} from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";
import { ActionContext } from "./actions/core/types";
import { ProcessImageAction, SaveImageAction } from "./actions/image";
import { IServiceContainer } from "../services/container";

export type ImageWorkerDependencies = BaseWorkerDependencies;

export interface ImageJobData extends BaseJobData {
  imageUrl?: string;
  imageData?: string; // Base64 encoded image data
  imageType?: string; // MIME type
  fileName?: string;
}

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
  ): BaseAction<any, any>[] {
    const actions: BaseAction<any, any>[] = [];

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
  };

  return new ImageWorker(queue, dependencies);
}

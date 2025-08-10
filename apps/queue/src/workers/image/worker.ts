import type {
  ImageProcessingData,
  ImageSaveData,
  ImageWorkerDependencies,
} from "./types";

import type { Queue } from "bullmq";

import { registerImageActions } from "../../services/image";
import { ActionName } from "../../types";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

export class ImageWorker extends BaseWorker<
  ImageProcessingData | ImageSaveData,
  ImageWorkerDependencies,
  ImageSaveData
> {
  constructor(queue: Queue, dependencies: ImageWorkerDependencies) {
    super(queue, dependencies);
    console.log("[IMAGE_WORKER] ImageWorker constructor called");
    console.log(`[IMAGE_WORKER] Queue name: ${queue.name}`);
    console.log(`[IMAGE_WORKER] Dependencies:`, Object.keys(dependencies));
  }

  protected registerActions(): void {
    console.log("[IMAGE_WORKER] Registering image actions");
    registerImageActions(this.actionFactory);
    console.log("[IMAGE_WORKER] Image actions registered successfully");
  }

  protected getOperationName(): string {
    return "image_processing";
  }

  protected createActionPipeline(
    _data: ImageProcessingData | ImageSaveData,
    _context: ActionContext
  ): WorkerAction<
    ImageProcessingData | ImageSaveData,
    ImageWorkerDependencies,
    ImageSaveData
  >[] {
    console.log("[IMAGE_WORKER] Creating action pipeline");
    const pipeline = [
      this.actionFactory.create(ActionName.UPLOAD_ORIGINAL, this.dependencies),
      this.actionFactory.create(ActionName.PROCESS_IMAGE, this.dependencies),
      this.actionFactory.create(ActionName.SAVE_IMAGE, this.dependencies),
      this.actionFactory.create(
        ActionName.IMAGE_COMPLETED_STATUS,
        this.dependencies
      ),
    ];
    console.log(`[IMAGE_WORKER] Created pipeline with ${pipeline.length} actions`);
    return pipeline;
  }

  protected async onBeforeJob(
    data: ImageProcessingData | ImageSaveData,
    context: ActionContext
  ): Promise<void> {
    console.log(`[IMAGE_WORKER] Starting job ${context.jobId}`);
    console.log(`[IMAGE_WORKER] Job data:`, data);
    console.log(`[IMAGE_WORKER] Job context:`, context);
  }

  protected async onAfterJob(
    data: ImageProcessingData | ImageSaveData,
    context: ActionContext,
    result: ImageSaveData
  ): Promise<void> {
    console.log(`[IMAGE_WORKER] Completed job ${context.jobId}`);
    console.log(`[IMAGE_WORKER] Job result:`, result);
  }

  protected async onJobError(
    error: Error,
    data: ImageProcessingData | ImageSaveData,
    context: ActionContext
  ): Promise<void> {
    console.error(`[IMAGE_WORKER] Job ${context.jobId} failed:`, error);
    console.error(`[IMAGE_WORKER] Failed job data:`, data);
  }
}

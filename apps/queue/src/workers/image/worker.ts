import type { ImageJobData, ImageWorkerDependencies } from "./types";

import type { Queue } from "bullmq";

import { registerImageActions } from "../../services/image";
import { ActionName } from "../../types";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext } from "../core/types";
import type { WorkerAction } from "../core/types";

export class ImageWorker extends BaseWorker<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  constructor(queue: Queue, dependencies: ImageWorkerDependencies) {
    super(queue, dependencies);
  }

  protected registerActions(): void {
    registerImageActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return "image-worker";
  }

  protected createActionPipeline(
    _data: ImageJobData,
    _context: ActionContext
  ): WorkerAction<ImageJobData, ImageWorkerDependencies, ImageJobData>[] {
    console.log("[IMAGE_WORKER] Creating action pipeline");
    const pipeline = [
      this.actionFactory.create(ActionName.UPLOAD_ORIGINAL, this.dependencies),
      this.actionFactory.create(ActionName.PROCESS_IMAGE, this.dependencies),
      this.actionFactory.create(ActionName.UPLOAD_PROCESSED, this.dependencies),
      this.actionFactory.create(ActionName.SAVE_IMAGE, this.dependencies),
      this.actionFactory.create(
        ActionName.CLEANUP_LOCAL_FILES,
        this.dependencies
      ),
      this.actionFactory.create(
        ActionName.IMAGE_COMPLETED_STATUS,
        this.dependencies
      ),
      this.actionFactory.create(
        ActionName.CHECK_IMAGE_COMPLETION,
        this.dependencies
      ),
    ];
    console.log(
      `[IMAGE_WORKER] Created pipeline with ${pipeline.length} actions`
    );
    return pipeline;
  }
}

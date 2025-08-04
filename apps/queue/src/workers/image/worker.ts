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
  }

  protected registerActions(): void {
    registerImageActions(this.actionFactory);
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
    return [
      this.actionFactory.create(ActionName.PROCESS_IMAGE, this.dependencies),
      this.actionFactory.create(ActionName.SAVE_IMAGE, this.dependencies),
      this.actionFactory.create(
        ActionName.IMAGE_COMPLETED_STATUS,
        this.dependencies
      ),
    ];
  }
}

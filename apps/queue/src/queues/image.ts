import { serviceContainer } from "../services/container";
import type { TypedQueue, ImageJobData, ImageActionName } from "../types";

export const imageQueue: TypedQueue<ImageJobData, ImageActionName> =
  serviceContainer.queues.imageQueue as TypedQueue<
    ImageJobData,
    ImageActionName
  >;

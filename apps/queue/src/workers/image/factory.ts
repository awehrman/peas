import { Queue } from "bullmq";

import { IServiceContainer } from "../../services/container";
import { buildImageWorkerDependencies } from "./dependencies";
import { ImageWorker } from "./worker";

export function createImageWorker(
  queue: Queue,
  container: IServiceContainer
): ImageWorker {
  const dependencies = buildImageWorkerDependencies(container);
  return new ImageWorker(queue, dependencies);
} 
import { buildImageWorkerDependencies } from "./dependencies";
import { ImageWorker } from "./worker";

import { Queue } from "bullmq";

import { IServiceContainer } from "../../services/container";

export function createImageWorker(
  queue: Queue,
  container: IServiceContainer
): ImageWorker {
  console.log("[IMAGE_WORKER_FACTORY] Creating image worker");
  console.log("[IMAGE_WORKER_FACTORY] Queue name:", queue.name);
  console.log(
    "[IMAGE_WORKER_FACTORY] Container services:",
    Object.keys(container)
  );

  const dependencies = buildImageWorkerDependencies(container);
  console.log(
    "[IMAGE_WORKER_FACTORY] Dependencies built:",
    Object.keys(dependencies)
  );

  const worker = new ImageWorker(queue, dependencies);
  console.log("[IMAGE_WORKER_FACTORY] Image worker created successfully");

  return worker;
}

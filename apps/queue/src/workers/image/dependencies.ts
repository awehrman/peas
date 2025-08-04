import type { ImageWorkerDependencies } from "./types";

import type { IServiceContainer } from "../../services/container";

export function buildImageWorkerDependencies(
  container: IServiceContainer
): ImageWorkerDependencies {
  console.log("[IMAGE_WORKER_DEPS] Building image worker dependencies");
  console.log("[IMAGE_WORKER_DEPS] Container available:", !!container);
  console.log("[IMAGE_WORKER_DEPS] Logger available:", !!container.logger);

  const dependencies = {
    serviceContainer: container,
    logger: container.logger,
  };

  console.log("[IMAGE_WORKER_DEPS] Dependencies built successfully");
  return dependencies;
}

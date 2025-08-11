import type { ImageWorkerDependencies } from "./types";

import type { IServiceContainer } from "../../services/container";
import { buildBaseDependencies } from "../core/worker-dependencies/build-base-dependencies";

export function buildImageWorkerDependencies(
  container: IServiceContainer
): ImageWorkerDependencies {
  const baseDependencies = buildBaseDependencies(container);

  const dependencies: ImageWorkerDependencies = {
    ...baseDependencies,
    serviceContainer: container,
  };

  console.log("[IMAGE_WORKER_DEPS] Dependencies built successfully");
  return dependencies;
}

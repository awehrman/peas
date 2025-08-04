import type { IServiceContainer } from "../../services/container";
import type { ImageWorkerDependencies } from "./types";

export function buildImageWorkerDependencies(
  container: IServiceContainer
): ImageWorkerDependencies {
  return {
    serviceContainer: container,
    logger: container.logger,
  };
} 
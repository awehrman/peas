import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "./dependencies";
import { buildCategorizationDependencies } from "./dependencies";
import { CategorizationWorker } from "./worker";

import type { Queue } from "bullmq";

import type { IServiceContainer } from "../../services/container";

/**
 * Create a categorization worker instance
 * @param queue The queue to process jobs from
 * @param container The service container
 * @returns A new categorization worker instance
 */
export function createCategorizationWorker(
  queue: Queue,
  container: IServiceContainer
): CategorizationWorker {
  return new CategorizationWorker(queue, container);
}

/**
 * Build categorization worker dependencies
 * @param container The service container
 * @returns Categorization worker dependencies
 */
export function buildCategorizationWorkerDependencies(
  container: IServiceContainer
): CategorizationWorkerDependencies {
  return buildCategorizationDependencies(container);
}

// Export types for external use
export type { CategorizationJobData, CategorizationWorkerDependencies };
export { CategorizationWorker };

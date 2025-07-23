import { createNoteWorker } from "./note";

import { Queue } from "bullmq";

import { LOG_MESSAGES, WORKER_CONSTANTS } from "../config/constants";
import type { IServiceContainer } from "../services/container";

import {
  type FlexibleWorker,
  type WorkerRegistry,
  createWorkerConfig,
  createWorkers,
} from "./shared/worker-factory";

/**
 * Start all workers for the given queues and service container
 * This function avoids circular dependencies by being called after the service container is fully initialized
 */
export function startWorkers(
  queues: {
    noteQueue: Queue;
    // TODO more queues here
  },
  serviceContainer: IServiceContainer
): WorkerRegistry<FlexibleWorker> {
  const workerConfigs = [
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.NOTE,
      createNoteWorker,
      queues.noteQueue
    ),
    // TODO more workers here
  ];

  const workers = createWorkers(workerConfigs, serviceContainer);

  // Store workers for graceful shutdown
  serviceContainer._workers = {
    noteWorker: workers[WORKER_CONSTANTS.NAMES.NOTE],
    // TODO more workers here
  } as WorkerRegistry<FlexibleWorker>;

  serviceContainer.logger.log(LOG_MESSAGES.INFO.WORKERS_STARTED);

  return workers;
}

import { createInstructionWorker } from "./instruction";
import { createNoteWorker } from "./note";

import { Queue } from "bullmq";

import { LOG_MESSAGES, WORKER_CONSTANTS } from "../config/constants";
import { queueMonitor } from "../monitoring/queue-monitor";
import type { IServiceContainer } from "../services/container";

import {
  type AllWorkers,
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
    instructionQueue: Queue;
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
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.INSTRUCTION,
      createInstructionWorker,
      queues.instructionQueue
    ),
    // TODO more workers here
  ];

  const workers = createWorkers<AllWorkers>(workerConfigs, serviceContainer);

  // Start monitoring queues
  queueMonitor.startMonitoring(queues.noteQueue);
  queueMonitor.startMonitoring(queues.instructionQueue);
  // TODO: Add monitoring for additional queues as they're implemented

  // Store workers for graceful shutdown
  serviceContainer._workers = {
    noteWorker: workers[WORKER_CONSTANTS.NAMES.NOTE],
    instructionWorker: workers[WORKER_CONSTANTS.NAMES.INSTRUCTION],
    // TODO more workers here
  } as WorkerRegistry<FlexibleWorker>;

  serviceContainer.logger.log(LOG_MESSAGES.INFO.WORKERS_STARTED);

  return workers;
}

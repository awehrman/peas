import { createIngredientWorker } from "./ingredient";
import { createInstructionWorker } from "./instruction";
import { createNoteWorker } from "./note";

import { Queue } from "bullmq";

import { LOG_MESSAGES, WORKER_CONSTANTS } from "../config/constants";
import { queueMonitor } from "../monitoring/queue-monitor";
import type { IServiceContainer } from "../services/container";

import { createImageWorker } from "./image/factory";
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
    ingredientQueue: Queue;
    imageQueue: Queue;
    // TODO more queues here
  },
  serviceContainer: IServiceContainer
): WorkerRegistry<FlexibleWorker> {
  console.log("[WORKER_STARTUP] Starting all workers");
  console.log("[WORKER_STARTUP] Available queues:", Object.keys(queues));
  console.log("[WORKER_STARTUP] Image queue available:", !!queues.imageQueue);
  console.log("[WORKER_STARTUP] Image queue name:", queues.imageQueue?.name);

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
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.INGREDIENT,
      createIngredientWorker,
      queues.ingredientQueue
    ),
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.IMAGE,
      createImageWorker,
      queues.imageQueue
    ),
    // TODO more workers here
  ];

  console.log("[WORKER_STARTUP] Created worker configs:", workerConfigs.length);

  const workers = createWorkers<AllWorkers>(workerConfigs, serviceContainer);

  console.log("[WORKER_STARTUP] Created workers:", Object.keys(workers));

  // Start monitoring queues
  queueMonitor.startMonitoring(queues.noteQueue);
  queueMonitor.startMonitoring(queues.instructionQueue);
  queueMonitor.startMonitoring(queues.ingredientQueue);
  queueMonitor.startMonitoring(queues.imageQueue);
  // TODO: Add monitoring for additional queues as they're implemented

  console.log("[WORKER_STARTUP] Started queue monitoring");

  // Store workers for graceful shutdown
  serviceContainer._workers = {
    noteWorker: workers[WORKER_CONSTANTS.NAMES.NOTE],
    instructionWorker: workers[WORKER_CONSTANTS.NAMES.INSTRUCTION],
    ingredientWorker: workers[WORKER_CONSTANTS.NAMES.INGREDIENT],
    imageWorker: workers[WORKER_CONSTANTS.NAMES.IMAGE],
    // TODO more workers here
  } as WorkerRegistry<FlexibleWorker>;

  console.log("[WORKER_STARTUP] Stored workers in service container");

  serviceContainer.logger.log(LOG_MESSAGES.INFO.WORKERS_STARTED);

  return workers;
}

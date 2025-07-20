import { Queue } from "bullmq";
import { createNoteWorker } from "./note";
import { createImageWorker } from "./image";
import { createIngredientWorker } from "./ingredient";
import { createInstructionWorker } from "./instruction";
import { createCategorizationWorker } from "./categorization";
import { createSourceWorker } from "./source";
import type { IServiceContainer } from "../services/container";
import {
  createWorkers,
  createWorkerConfig,
  type WorkerRegistry,
} from "./shared/worker-factory";
import { WORKER_CONSTANTS, LOG_MESSAGES } from "../config/constants";

/**
 * Start all workers for the given queues and service container
 * This function avoids circular dependencies by being called after the service container is fully initialized
 */
export function startWorkers(
  queues: {
    noteQueue: Queue;
    imageQueue: Queue;
    ingredientQueue: Queue;
    instructionQueue: Queue;
    categorizationQueue: Queue;
    sourceQueue: Queue;
  },
  serviceContainer: IServiceContainer
): WorkerRegistry {
  const workerConfigs = [
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.NOTE,
      createNoteWorker,
      queues.noteQueue
    ),
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.IMAGE,
      createImageWorker,
      queues.imageQueue
    ),
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.INGREDIENT,
      createIngredientWorker,
      queues.ingredientQueue
    ),
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.INSTRUCTION,
      createInstructionWorker,
      queues.instructionQueue
    ),
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.CATEGORIZATION,
      createCategorizationWorker,
      queues.categorizationQueue
    ),
    createWorkerConfig(
      WORKER_CONSTANTS.NAMES.SOURCE,
      createSourceWorker,
      queues.sourceQueue
    ),
  ];

  const workers = createWorkers(workerConfigs, serviceContainer);

  // Store workers for graceful shutdown
  serviceContainer._workers = {
    noteWorker: workers[WORKER_CONSTANTS.NAMES.NOTE],
    imageWorker: workers[WORKER_CONSTANTS.NAMES.IMAGE],
    ingredientWorker: workers[WORKER_CONSTANTS.NAMES.INGREDIENT],
    instructionWorker: workers[WORKER_CONSTANTS.NAMES.INSTRUCTION],
    categorizationWorker: workers[WORKER_CONSTANTS.NAMES.CATEGORIZATION],
    sourceWorker: workers[WORKER_CONSTANTS.NAMES.SOURCE],
  };

  serviceContainer.logger.log(LOG_MESSAGES.INFO.WORKERS_STARTED);

  return workers;
}

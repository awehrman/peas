import { Queue } from "bullmq";
import type { IServiceContainer } from "../../services/container";
import type { BaseWorker } from "../core/base-worker";
import type { BaseJobData, BaseWorkerDependencies } from "../types";
import { LOG_MESSAGES } from "../../config/constants";
import { formatLogMessage } from "../../utils";

/**
 * Worker factory function type
 */
export type WorkerFactory = (
  queue: Queue,
  container: IServiceContainer
) => BaseWorker<BaseJobData, BaseWorkerDependencies>;

/**
 * Worker configuration
 */
export interface WorkerConfig {
  name: string;
  factory: WorkerFactory;
  queue: Queue;
}

/**
 * Worker registry for managing all workers
 */
export interface WorkerRegistry {
  [key: string]: BaseWorker<BaseJobData, BaseWorkerDependencies>;
}

/**
 * Create and start multiple workers
 */
export function createWorkers(
  configs: WorkerConfig[],
  container: IServiceContainer
): WorkerRegistry {
  const workers: WorkerRegistry = {};

  for (const config of configs) {
    try {
      const worker = config.factory(config.queue, container);
      workers[config.name] = worker;

      container.logger.log(
        formatLogMessage(LOG_MESSAGES.SUCCESS.WORKER_STARTED, {
          workerName: config.name,
        })
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      container.logger.log(
        formatLogMessage(LOG_MESSAGES.ERROR.WORKER_FAILED, {
          workerName: config.name,
          error: errorMessage,
        }),
        "error"
      );
      throw error;
    }
  }

  return workers;
}

/**
 * Close all workers gracefully
 */
export async function closeWorkers(
  workers: WorkerRegistry,
  container: IServiceContainer
): Promise<void> {
  const closePromises = Object.entries(workers).map(async ([name, worker]) => {
    try {
      await worker.close();
      container.logger.log(
        formatLogMessage(LOG_MESSAGES.SUCCESS.WORKER_CLOSED, {
          workerName: name,
        })
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      container.logger.log(
        formatLogMessage(LOG_MESSAGES.ERROR.WORKER_ERROR, {
          workerName: name,
          error: errorMessage,
        }),
        "error"
      );
    }
  });

  await Promise.allSettled(closePromises);
}

/**
 * Get worker status information
 */
export function getWorkerStatus(workers: WorkerRegistry) {
  return Object.entries(workers).map(([name, worker]) => ({
    name,
    status: worker.getStatus(),
  }));
}

/**
 * Validate worker configuration
 */
export function validateWorkerConfig(config: WorkerConfig): void {
  if (!config.name || typeof config.name !== "string") {
    throw new Error("Worker config must have a valid name");
  }

  if (!config.factory || typeof config.factory !== "function") {
    throw new Error("Worker config must have a valid factory function");
  }

  if (!config.queue) {
    throw new Error("Worker config must have a valid queue");
  }
}

/**
 * Create worker config with validation
 */
export function createWorkerConfig(
  name: string,
  factory: WorkerFactory,
  queue: Queue
): WorkerConfig {
  const config = { name, factory, queue };
  validateWorkerConfig(config);
  return config;
}

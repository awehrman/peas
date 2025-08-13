import { Queue } from "bullmq";

import { LOG_MESSAGES } from "../../config/constants";
import type { IServiceContainer } from "../../services/container";
import { formatLogMessage } from "../../utils/utils";
import type { BaseWorker } from "../core/base-worker";
import type { IngredientWorker } from "../ingredient/worker";
import type { InstructionWorker } from "../instruction/worker";
import type { NoteWorker } from "../note/worker";
import type { BaseJobData, BaseWorkerDependencies } from "../types";
import type { ImageWorker } from "../image/worker";
import type { PatternTrackingWorker } from "../pattern-tracking/worker";
import type { CategorizationWorker } from "../categorization/worker";

/**
 * Union type of all concrete worker types in the system.
 * Extend this as you add more workers.
 */
export type AllWorkers = NoteWorker | InstructionWorker | IngredientWorker | ImageWorker | PatternTrackingWorker | CategorizationWorker;

/**
 * Worker factory function type
 * @template TWorker - The worker type
 */
export type WorkerFactory<
  TWorker = BaseWorker<BaseJobData, BaseWorkerDependencies>,
> = (queue: Queue, container: IServiceContainer) => TWorker;

/**
 * Worker configuration
 * @template TWorker - The worker type
 */
export interface WorkerConfig<
  TWorker = BaseWorker<BaseJobData, BaseWorkerDependencies>,
> {
  name: string;
  factory: WorkerFactory<TWorker>;
  queue: Queue;
}

/**
 * Worker registry for managing all workers
 * @template TWorker - The worker type
 */
export interface WorkerRegistry<TWorker = AllWorkers> {
  [key: string]: TWorker;
}

/**
 * Flexible worker type that can handle different worker implementations
 */
export type FlexibleWorker = AllWorkers;

/**
 * Create and start multiple workers
 * @template TWorker - The worker type
 * @param configs - Array of worker configs
 * @param container - Service container
 * @returns Worker registry
 */
export function createWorkers<TWorker = AllWorkers>(
  configs: WorkerConfig<TWorker>[],
  container: IServiceContainer
): WorkerRegistry<TWorker> {
  const workers: WorkerRegistry<TWorker> = {};
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
 * @template TWorker - The worker type
 * @param workers - Worker registry
 * @param container - Service container
 */
export async function closeWorkers<
  TWorker extends { close: () => Promise<void>; getStatus: () => unknown },
>(
  workers: WorkerRegistry<TWorker>,
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
 * @template TWorker - The worker type
 * @param workers - Worker registry
 * @returns Array of worker status objects
 */
export function getWorkerStatus<TWorker extends { getStatus: () => unknown }>(
  workers: WorkerRegistry<TWorker>
) {
  return Object.entries(workers).map(([name, worker]) => ({
    name,
    status: worker.getStatus(),
  }));
}

/**
 * Validate worker configuration
 * @param config - Worker config
 */
export function validateWorkerConfig<TWorker>(
  config: WorkerConfig<TWorker>
): void {
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
 * @template TWorker - The worker type
 * @param name - Worker name
 * @param factory - Worker factory
 * @param queue - BullMQ queue
 * @returns Worker config
 */
export function createWorkerConfig<TWorker>(
  name: string,
  factory: WorkerFactory<TWorker>,
  queue: Queue
): WorkerConfig<TWorker> {
  const config = { name, factory, queue };
  validateWorkerConfig(config);
  return config;
}

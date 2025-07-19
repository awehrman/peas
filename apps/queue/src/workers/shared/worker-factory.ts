import { Queue } from "bullmq";
import type { IServiceContainer } from "../../services/container";
import type { BaseWorker } from "../core/base-worker";
import type { BaseJobData } from "../types";

/**
 * Worker factory function type
 */
export type WorkerFactory = (
  queue: Queue,
  container: IServiceContainer
) => BaseWorker<BaseJobData, unknown>;

/**
 * Worker configuration
 */
export interface WorkerConfig {
  name: string;
  factory: WorkerFactory;
  queue: Queue;
}

/**
 * Create and start multiple workers
 */
export function createWorkers(
  configs: WorkerConfig[],
  container: IServiceContainer
): Record<string, BaseWorker<BaseJobData, unknown>> {
  const workers: Record<string, BaseWorker<BaseJobData, unknown>> = {};

  for (const config of configs) {
    try {
      const worker = config.factory(config.queue, container);
      workers[config.name] = worker;
      container.logger.log(`✅ ${config.name} worker created and started`);
    } catch (error) {
      container.logger.log(
        `❌ Failed to create ${config.name} worker: ${error}`,
        "error"
      );
      throw error;
    }
  }

  return workers;
}

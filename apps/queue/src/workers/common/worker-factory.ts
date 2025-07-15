import { Worker, Queue, Job } from "bullmq";
import { redisConnection } from "../../config/redis";
import { createEventHandlers, registerEventHandlers } from "./event-handlers";

/**
 * Configuration for creating a BullMQ worker.
 */
export interface WorkerConfig {
  /** The BullMQ queue to process jobs from. */
  queue: Queue;
  /** The job processing function. Receives the job, queue, and dependencies. */
  jobProcessor: (
    job: Job,
    queue: Queue,
    dependencies?: Record<string, any>
  ) => Promise<any>;
  /** Maximum number of concurrent jobs. Default: 3. */
  concurrency?: number;
  /** Name of the worker (for logging). */
  workerName: string;
  /** Dependencies to inject into the job processor. */
  dependencies?: Record<string, any>;
}

/**
 * Creates a standardized BullMQ worker with common event handlers.
 *
 * @param config Worker configuration
 * @returns The created BullMQ Worker
 */
export function createWorker(config: WorkerConfig): Worker {
  const {
    queue,
    jobProcessor,
    concurrency = 3,
    workerName,
    dependencies = {},
  } = config;

  const worker = new Worker(
    queue.name,
    (job) => jobProcessor(job, queue, dependencies),
    {
      connection: redisConnection,
      concurrency,
    }
  );

  const handlers = createEventHandlers({
    queueName: queue.name,
    workerName,
  });
  registerEventHandlers(worker, handlers);

  return worker;
}

/**
 * Creates a BullMQ worker with custom event handlers.
 *
 * @param config Worker configuration
 * @param customHandlers Custom event handlers to register
 * @returns The created BullMQ Worker
 */
export function createWorkerWithCustomHandlers(
  config: WorkerConfig,
  customHandlers: any
): Worker {
  const { queue, jobProcessor, concurrency = 3, dependencies = {} } = config;
  const worker = new Worker(
    queue.name,
    (job) => jobProcessor(job, queue, dependencies),
    {
      connection: redisConnection,
      concurrency,
    }
  );
  registerEventHandlers(worker, customHandlers);
  return worker;
}

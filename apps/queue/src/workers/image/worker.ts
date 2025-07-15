import { Worker, Queue } from "bullmq";
import { redisConnection } from "../../config/redis";
import { processImageJob } from "./job-orchestrator";
import { registerImageEventHandlers } from "./event-handlers";

export function setupImageWorker(queue: Queue): Worker {
  const worker = new Worker(queue.name, (job) => processImageJob(job, queue), {
    connection: redisConnection,
    concurrency: 2, // Limit concurrent image processing
  });

  registerImageEventHandlers(worker, queue);

  return worker;
}

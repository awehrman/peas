import { Worker, Queue } from "bullmq";
import { redisConnection } from "../../config/redis";
import { processIngredientJob } from "./job-orchestrator";
import { registerIngredientEventHandlers } from "./event-handlers";

export function setupIngredientWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    (job) => processIngredientJob(job, queue),
    {
      connection: redisConnection,
      concurrency: 3, // Process multiple ingredient parsing jobs simultaneously
    }
  );

  registerIngredientEventHandlers(worker, queue);

  return worker;
}

import { Worker, Queue } from "bullmq";
import { redisConnection } from "../../config/redis";
import { processCategorizationJob } from "./job-orchestrator";
import { registerCategorizationEventHandlers } from "./event-handlers";

export function setupCategorizationWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    (job) => processCategorizationJob(job, queue),
    {
      connection: redisConnection,
      concurrency: 3, // Process multiple categorization jobs simultaneously
    }
  );

  registerCategorizationEventHandlers(worker, queue);

  return worker;
}

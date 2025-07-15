import { Worker, Queue } from "bullmq";
import { redisConnection } from "../../config/redis";
import { parseHTML } from "../../parsers/html";
import { createNote } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";
import { InstructionWorkerDependencies } from "./types";
import { processInstructionJob } from "./process-job";
import { createEventHandlers } from "./event-handlers";

export function getDefaultDependencies(): Omit<
  InstructionWorkerDependencies,
  "ingredientQueue" | "instructionQueue" | "imageQueue" | "categorizationQueue"
> {
  return {
    parseHTML,
    createNote,
    addStatusEventAndBroadcast,
    ErrorHandler,
    HealthMonitor,
    logger: console,
  };
}

export function setupInstructionWorker(
  queue: Queue,
  subQueues: Pick<
    InstructionWorkerDependencies,
    | "ingredientQueue"
    | "instructionQueue"
    | "imageQueue"
    | "categorizationQueue"
  >,
  dependencies: Partial<
    Omit<
      InstructionWorkerDependencies,
      | "ingredientQueue"
      | "instructionQueue"
      | "imageQueue"
      | "categorizationQueue"
    >
  > = {}
): Worker {
  const deps: InstructionWorkerDependencies = {
    ...getDefaultDependencies(),
    ...dependencies,
    ...subQueues,
  };

  const worker = new Worker(
    queue.name,
    async (job) => processInstructionJob(job, queue, deps),
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  const handlers = createEventHandlers(
    deps.logger ?? console,
    deps.ErrorHandler,
    queue.name
  );

  worker.on("completed", handlers.onCompleted);
  worker.on("failed", handlers.onFailed);
  worker.on("error", handlers.onError);

  return worker;
}

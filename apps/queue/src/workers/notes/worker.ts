import { Worker, Queue } from "bullmq";
import { redisConnection } from "../../config/redis";
import { parseHTML } from "../../parsers/html";
import { createNote } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";
import { NoteWorkerDependencies } from "./types";
import { processNoteJob } from "./job-orchestrator";
import { createEventHandlers } from "./event-handlers";

export function getDefaultDependencies(): Omit<
  NoteWorkerDependencies,
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

export function setupNoteWorker(
  queue: Queue,
  subQueues: Pick<
    NoteWorkerDependencies,
    | "ingredientQueue"
    | "instructionQueue"
    | "imageQueue"
    | "categorizationQueue"
  >,
  dependencies: Partial<
    Omit<
      NoteWorkerDependencies,
      | "ingredientQueue"
      | "instructionQueue"
      | "imageQueue"
      | "categorizationQueue"
    >
  > = {}
): Worker {
  const deps: NoteWorkerDependencies = {
    ...getDefaultDependencies(),
    ...dependencies,
    ...subQueues,
  };

  const worker = new Worker(
    queue.name,
    async (job) => processNoteJob(job, queue, deps),
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  const handlers = createEventHandlers(
    deps.logger,
    deps.ErrorHandler,
    queue.name
  );

  worker.on("completed", handlers.onCompleted);
  worker.on("failed", handlers.onFailed);
  worker.on("error", handlers.onError);

  return worker;
}

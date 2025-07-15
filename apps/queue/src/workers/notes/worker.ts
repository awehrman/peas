import { Worker, Queue } from "bullmq";
import { parseHTML } from "../../parsers/html";
import { createNote } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";
import { NoteWorkerDependencies } from "./types";
import { processNoteJob } from "./job-orchestrator";
import { createWorker } from "../common/worker-factory";

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

  return createWorker({
    queue,
    jobProcessor: (job, queue, dependencies) =>
      processNoteJob(job, queue, dependencies as NoteWorkerDependencies),
    concurrency: 5,
    workerName: "Note processing",
    dependencies: deps,
  });
}

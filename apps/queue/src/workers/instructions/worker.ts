import { Worker, Queue } from "bullmq";
import { parseHTML } from "../../parsers/html";
import { createNote } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";
import { InstructionWorkerDependencies } from "./types";
import { processInstructionJob } from "./job-orchestrator";
import { createWorker } from "../common/worker-factory";

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

  return createWorker({
    queue,
    jobProcessor: (job, queue, dependencies) =>
      processInstructionJob(
        job,
        queue,
        dependencies as InstructionWorkerDependencies
      ),
    concurrency: 3,
    workerName: "Instruction parsing",
    dependencies: deps,
  });
}

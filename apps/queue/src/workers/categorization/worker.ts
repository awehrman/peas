import { Queue } from "bullmq";
import { processCategorizationJob } from "./job-orchestrator";
import { createWorker } from "../common/worker-factory";

export function setupCategorizationWorker(queue: Queue) {
  return createWorker({
    queue,
    jobProcessor: processCategorizationJob,
    concurrency: 3,
    workerName: "Categorization",
    dependencies: {},
  });
}

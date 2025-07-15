import { Queue } from "bullmq";
import { processImageJob } from "./job-orchestrator";
import { createWorker } from "../common/worker-factory";

export function setupImageWorker(queue: Queue) {
  return createWorker({
    queue,
    jobProcessor: processImageJob,
    concurrency: 2,
    workerName: "Image processing",
    dependencies: {},
  });
}

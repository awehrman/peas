import { Queue } from "bullmq";
import { processIngredientJob } from "./job-orchestrator";
import { createWorker } from "../common/worker-factory";

export function setupIngredientWorker(queue: Queue) {
  return createWorker({
    queue,
    jobProcessor: processIngredientJob,
    concurrency: 3,
    workerName: "Ingredient parsing",
    dependencies: {},
  });
}

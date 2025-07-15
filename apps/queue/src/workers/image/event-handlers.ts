import { Worker, Queue } from "bullmq";
import { ErrorHandler } from "../../utils";
import { ErrorType, ErrorSeverity } from "../../types";

export function registerImageEventHandlers(worker: Worker, queue: Queue): void {
  worker.on("completed", (job) => {
    console.log(`✅ Image processing job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `❌ Image processing job ${job?.id ?? "unknown"} failed:`,
      errorMessage
    );
  });

  worker.on("error", (err) => {
    const jobError = ErrorHandler.createJobError(
      err,
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.CRITICAL,
      { operation: "worker_error", queueName: queue.name }
    );
    ErrorHandler.logError(jobError);
  });
}

import { Worker, Queue } from "bullmq";
import { ErrorHandler } from "../../utils";
import { ErrorType, ErrorSeverity } from "../../types";

export function registerIngredientEventHandlers(worker: Worker, queue: Queue) {
  worker.on("completed", (job) => {
    console.log(`✅ Ingredient parsing job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    const errorMessage =
      err instanceof Error && (err as any).jobError
        ? (err as any).jobError.message
        : err.message;
    console.error(
      `❌ Ingredient parsing job ${job?.id ?? "unknown"} failed:`,
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

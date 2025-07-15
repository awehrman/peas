import { NoteWorkerDependencies } from "./types";
import { ErrorHandler } from "../../utils/error-handler";
import { ErrorType, ErrorSeverity } from "../../types";
import { Job } from "bullmq";

export function createEventHandlers(
  logger: NoteWorkerDependencies["logger"],
  errorHandler: typeof ErrorHandler,
  queueName: string
) {
  return {
    onCompleted: (job: Job) => {
      logger?.log(`✅ Note processing job ${job?.id ?? "unknown"} completed`);
    },
    onFailed: (job: Job | undefined, err: Error) => {
      logger?.error(
        `❌ Note processing job ${job?.id ?? "unknown"} failed:`,
        err
      );
    },
    onError: (err: Error) => {
      const jobError = errorHandler.createJobError(
        err,
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.CRITICAL,
        { operation: "worker_error", queueName }
      );
      errorHandler.logError(jobError);
    },
  };
}

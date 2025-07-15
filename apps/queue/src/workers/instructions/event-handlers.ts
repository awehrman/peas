import { Job } from "bullmq";
import { QueueError } from "../../utils";
import { ErrorType, ErrorSeverity } from "../../types";

export interface EventHandlers {
  onCompleted: (job: Job) => void;
  onFailed: (job: Job | undefined, err: Error) => void;
  onError: (err: Error) => void;
}

export function createEventHandlers(
  logger: {
    log: (message: string) => void;
    error: (message: string, error?: Error) => void;
  },
  ErrorHandler: any,
  queueName: string
): EventHandlers {
  return {
    onCompleted: (job: Job) => {
      console.log(
        `✅ Instruction parsing job ${job?.id ?? "unknown"} completed`
      );
    },

    onFailed: (job: Job | undefined, err: Error) => {
      const errorMessage =
        err instanceof QueueError ? err.jobError.message : err.message;
      console.error(
        `❌ Instruction parsing job ${job?.id ?? "unknown"} failed:`,
        errorMessage
      );
    },

    onError: (err: Error) => {
      const jobError = ErrorHandler.createJobError(
        err,
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.CRITICAL,
        { operation: "worker_error", queueName }
      );
      ErrorHandler.logError(jobError);
    },
  };
}

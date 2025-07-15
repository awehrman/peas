import { Job } from "bullmq";
import { ErrorHandler } from "../../utils/error-handler";
import { ErrorType, ErrorSeverity } from "../../types";

/**
 * Event handler signatures for BullMQ workers.
 */
export interface EventHandlers {
  onCompleted: (job: Job) => void;
  onFailed: (job: Job | undefined, err: Error) => void;
  onError: (err: Error) => void;
}

/**
 * Configuration for creating event handlers.
 */
export interface EventHandlerConfig {
  /** Logger with log and error methods. Default: console. */
  logger?: {
    log: (message: string) => void;
    error: (message: string) => void;
  };
  /** Error handler for structured error logging. Default: ErrorHandler. */
  errorHandler?: typeof ErrorHandler;
  /** Name of the queue. */
  queueName: string;
  /** Name of the worker (for logging). */
  workerName: string;
}

/**
 * Creates standardized event handlers for BullMQ workers.
 *
 * @param config Event handler configuration
 * @returns EventHandlers object
 */
export function createEventHandlers(config: EventHandlerConfig): EventHandlers {
  const {
    logger = console,
    errorHandler = ErrorHandler,
    queueName,
    workerName,
  } = config;

  return {
    onCompleted: (job: Job) => {
      logger.log(`✅ ${workerName} job ${job?.id ?? "unknown"} completed`);
    },

    onFailed: (job: Job | undefined, err: Error) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        `❌ ${workerName} job ${job?.id ?? "unknown"} failed: ${errorMessage}`
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

/**
 * Registers event handlers on a BullMQ worker.
 *
 * @param worker The BullMQ worker
 * @param handlers The event handlers to register
 */
export function registerEventHandlers(
  worker: any,
  handlers: EventHandlers
): void {
  worker.on("completed", handlers.onCompleted);
  worker.on("failed", handlers.onFailed);
  worker.on("error", handlers.onError);
}

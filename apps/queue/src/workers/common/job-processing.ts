import { Job, Queue } from "bullmq";
import { QueueError } from "../../utils/error-handler";
import { ErrorType, ErrorSeverity } from "../../types";
import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";

export interface JobProcessingContext {
  jobId: string;
  retryCount: number;
  queueName: string;
}

export interface JobProcessingDependencies {
  ErrorHandler: any;
  logger?: any;
}

/**
 * Extracts common job context information
 */
export function extractJobContext(
  job: Job,
  queue: Queue
): JobProcessingContext {
  return {
    jobId: job.id ?? "unknown",
    retryCount: job.attemptsMade,
    queueName: queue.name,
  };
}

/**
 * Handles validation errors with consistent logging and error creation
 */
export function handleValidationError(
  validationError: any,
  context: JobProcessingContext,
  deps: JobProcessingDependencies
): never {
  validationError.jobId = context.jobId;
  validationError.queueName = context.queueName;
  validationError.retryCount = context.retryCount;
  deps.ErrorHandler.logError(validationError);
  throw new QueueError(validationError);
}

/**
 * Handles service health check failures
 */
export function handleUnhealthyService(
  context: JobProcessingContext,
  deps: JobProcessingDependencies
): never {
  const healthError = deps.ErrorHandler.createJobError(
    "Service is unhealthy, skipping job processing",
    ErrorType.EXTERNAL_SERVICE_ERROR,
    ErrorSeverity.HIGH,
    {
      jobId: context.jobId,
      queueName: context.queueName,
      retryCount: context.retryCount,
    }
  );
  deps.ErrorHandler.logError(healthError);
  throw new QueueError(healthError);
}

/**
 * Handles retry logic for QueueError instances
 */
export function handleQueueError(
  error: QueueError,
  context: JobProcessingContext,
  deps: JobProcessingDependencies
): never {
  const jobError = error.jobError;
  jobError.jobId = context.jobId;
  jobError.queueName = context.queueName;
  jobError.retryCount = context.retryCount;

  deps.ErrorHandler.logError(jobError);

  if (deps.ErrorHandler.shouldRetry(jobError, context.retryCount)) {
    const backoffDelay = deps.ErrorHandler.calculateBackoff(context.retryCount);
    deps.logger?.log(
      `Scheduling retry for job ${context.jobId} in ${backoffDelay}ms`
    );
    throw error; // Re-throw for BullMQ retry
  } else {
    deps.logger?.log(
      `Job ${context.jobId} failed permanently after ${context.retryCount + 1} attempts`
    );
    throw error;
  }
}

/**
 * Handles unexpected errors by classifying and wrapping them
 */
export function handleUnexpectedError(
  error: Error,
  context: JobProcessingContext,
  deps: JobProcessingDependencies
): never {
  const unexpectedError = deps.ErrorHandler.classifyError(error);
  unexpectedError.jobId = context.jobId;
  unexpectedError.queueName = context.queueName;
  unexpectedError.retryCount = context.retryCount;

  deps.ErrorHandler.logError(unexpectedError);
  throw new QueueError(unexpectedError);
}

/**
 * Validates job data and checks service health
 */
export async function validateJobDataAndHealth<T>(
  job: Job,
  queue: Queue,
  requiredFields: (keyof T)[],
  operationName: string
): Promise<void> {
  const context = extractJobContext(job, queue);
  const deps = { ErrorHandler, logger: console };

  // Validate job data
  const validationError = ErrorHandler.validateJobData<T>(
    job.data,
    requiredFields
  );

  if (validationError) {
    handleValidationError(validationError, context, deps);
  }

  // Check service health
  const healthMonitor = HealthMonitor.getInstance();
  const isHealthy = await healthMonitor.isHealthy();

  if (!isHealthy) {
    const healthError = ErrorHandler.createJobError(
      `Service is unhealthy, skipping ${operationName}`,
      ErrorType.EXTERNAL_SERVICE_ERROR,
      ErrorSeverity.HIGH,
      {
        jobId: context.jobId,
        queueName: context.queueName,
        retryCount: context.retryCount,
      }
    );
    ErrorHandler.logError(healthError);
    throw new QueueError(healthError);
  }
}

/**
 * Handles job errors with consistent logging, status updates, and retry logic
 */
export async function handleJobError(
  error: unknown,
  job: Job,
  queue: Queue,
  context: string
): Promise<never> {
  const jobContext = extractJobContext(job, queue);
  const deps = { ErrorHandler, logger: console };

  // Handle structured errors
  if (error instanceof QueueError) {
    // Add failure status event
    try {
      const noteId = (job.data as any).noteId || (job.data as any).note?.id;
      if (noteId) {
        await addStatusEventAndBroadcast({
          noteId,
          status: "FAILED",
          message: `${context} failed: ${error.jobError.message}`,
          context,
        });
      }
    } catch (statusError) {
      console.error("Failed to add failure status event:", statusError);
    }

    handleQueueError(error, jobContext, deps);
  }

  // Handle unexpected errors
  handleUnexpectedError(error as Error, jobContext, deps);
}

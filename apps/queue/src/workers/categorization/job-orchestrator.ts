import { Job, Queue } from "bullmq";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler, QueueError } from "../../utils";
import { ErrorType, ErrorSeverity, CategorizationJobData } from "../../types";
import { HealthMonitor } from "../../utils/health-monitor";
import { CategorizationProcessor } from "./processor";

export async function processCategorizationJob(
  job: Job,
  queue: Queue
): Promise<void> {
  const jobId = job.id;
  const retryCount = job.attemptsMade;

  console.log(
    `Processing categorization job ${jobId} (attempt ${retryCount + 1})`
  );

  try {
    // Validate job data
    const validationError = ErrorHandler.validateJobData<CategorizationJobData>(
      job.data,
      ["noteId", "file"]
    );

    if (validationError) {
      validationError.jobId = jobId;
      validationError.queueName = queue.name;
      validationError.retryCount = retryCount;
      ErrorHandler.logError(validationError);
      throw new QueueError(validationError);
    }

    const { noteId } = job.data as CategorizationJobData;

    // Check service health before processing
    const healthMonitor = HealthMonitor.getInstance();
    const isHealthy = await healthMonitor.isHealthy();

    if (!isHealthy) {
      const healthError = ErrorHandler.createJobError(
        "Service is unhealthy, skipping categorization processing",
        ErrorType.EXTERNAL_SERVICE_ERROR,
        ErrorSeverity.HIGH,
        { jobId, queueName: queue.name, retryCount }
      );
      ErrorHandler.logError(healthError);
      throw new QueueError(healthError);
    }

    // Add status event with error handling
    await ErrorHandler.withErrorHandling(
      () =>
        addStatusEventAndBroadcast({
          noteId,
          status: "PROCESSING",
          message: "Applying categories and tags...",
          context: "categorization",
        }),
      { jobId, noteId, operation: "add_status_event" }
    );

    // Apply stub categories and tags
    await ErrorHandler.withErrorHandling(
      async () => {
        CategorizationProcessor.applyCategory(noteId, "Uncategorized");
        CategorizationProcessor.applyTag(noteId, "recipe");
        CategorizationProcessor.applyTag(noteId, "imported");
      },
      { jobId, noteId, operation: "apply_categories_tags" }
    );

    // Add completion status event with error handling
    await ErrorHandler.withErrorHandling(
      () =>
        addStatusEventAndBroadcast({
          noteId,
          status: "COMPLETED",
          message: "Categories and tags applied successfully",
          context: "categorization",
        }),
      { jobId, noteId, operation: "add_completion_status" }
    );

    console.log(`Categorization job ${jobId} completed successfully`);
  } catch (error) {
    // Handle structured errors
    if (error instanceof QueueError) {
      const jobError = error.jobError;
      jobError.jobId = jobId;
      jobError.queueName = queue.name;
      jobError.retryCount = retryCount;

      ErrorHandler.logError(jobError);

      // Add failure status event
      try {
        await addStatusEventAndBroadcast({
          noteId: job.data.noteId,
          status: "FAILED",
          message: `Categorization failed: ${jobError.message}`,
          context: "categorization",
        });
      } catch (statusError) {
        console.error("Failed to add failure status event:", statusError);
      }

      // Determine if job should be retried
      if (ErrorHandler.shouldRetry(jobError, retryCount)) {
        const backoffDelay = ErrorHandler.calculateBackoff(retryCount);
        console.log(
          `Scheduling retry for categorization job ${jobId} in ${backoffDelay}ms`
        );
        throw error; // Re-throw for BullMQ retry
      } else {
        console.log(
          `Categorization job ${jobId} failed permanently after ${retryCount + 1} attempts`
        );
        throw error; // Re-throw to mark job as failed
      }
    }

    // Handle unexpected errors
    const unexpectedError = ErrorHandler.classifyError(error as Error);
    unexpectedError.jobId = jobId;
    unexpectedError.queueName = queue.name;
    unexpectedError.retryCount = retryCount;

    ErrorHandler.logError(unexpectedError);
    throw new QueueError(unexpectedError);
  }
}

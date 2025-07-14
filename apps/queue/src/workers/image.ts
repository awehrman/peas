// Status events: Only emitted at major steps and on completion for performance.
// This reduces DB connection overhead and status event spam.
import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "@peas/database";
import { addStatusEventAndBroadcast } from "../utils/status-broadcaster";
import { ErrorHandler, QueueError } from "../utils";
import { ErrorType, ErrorSeverity, ImageJobData } from "../types";
import { HealthMonitor } from "../utils/health-monitor";

const IMAGE_PROCESSING_STEPS = [
  "Extracting image from HTML content",
  "Validating image format",
  "Compressing image for storage",
  "Uploading to cloud storage",
  "Generating thumbnail",
] as const;

const PROCESSING_DELAY_MS = 500;
const STATUS_UPDATE_INTERVAL = 2; // Only send status every N steps

export function setupImageWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async (job) => {
      const jobId = job.id;
      const retryCount = job.attemptsMade;

      // Processing image job

      try {
        // Validate job data
        const validationError = ErrorHandler.validateJobData<ImageJobData>(
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

        const { noteId } = job.data as ImageJobData;

        // Check service health before processing
        const healthMonitor = HealthMonitor.getInstance();
        const isHealthy = await healthMonitor.isHealthy();

        if (!isHealthy) {
          const healthError = ErrorHandler.createJobError(
            "Service is unhealthy, skipping image processing",
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
              message: "Starting image upload process...",
              context: "image upload",
            }),
          { jobId, noteId, operation: "add_status_event" }
        );

        // Process each step with reduced status updates and error handling
        for (let i = 0; i < IMAGE_PROCESSING_STEPS.length; i++) {
          const step = IMAGE_PROCESSING_STEPS[i];
          const progress = Math.round(
            ((i + 1) / IMAGE_PROCESSING_STEPS.length) * 100
          );

          try {
            // Simulate processing time with error handling
            await ErrorHandler.withErrorHandling(
              () =>
                new Promise((resolve) =>
                  setTimeout(resolve, PROCESSING_DELAY_MS)
                ),
              { jobId, noteId, step, operation: "image_processing_step" }
            );

            // Only send status updates at intervals or at the end
            if (
              i % STATUS_UPDATE_INTERVAL === 0 ||
              i === IMAGE_PROCESSING_STEPS.length - 1
            ) {
              await ErrorHandler.withErrorHandling(
                () =>
                  addStatusEventAndBroadcast({
                    noteId,
                    status: "PROCESSING",
                    message: `...[${progress}%] ${step}`,
                    context: "image upload",
                    currentCount: i + 1,
                    totalCount: IMAGE_PROCESSING_STEPS.length,
                  }),
                { jobId, noteId, step, operation: "add_progress_status" }
              );
            }
          } catch (stepError) {
            const stepJobError = ErrorHandler.createJobError(
              stepError as Error,
              ErrorType.EXTERNAL_SERVICE_ERROR,
              ErrorSeverity.MEDIUM,
              {
                jobId,
                noteId,
                step,
                stepIndex: i,
                operation: "image_processing_step",
              }
            );
            ErrorHandler.logError(stepJobError);

            // Continue with next step instead of failing entire job
            console.warn(
              `⚠️ Image processing step failed: ${step}, continuing with next step`
            );
          }
        }

        // Update note with mock image URL with error handling
        await ErrorHandler.withErrorHandling(
          () =>
            prisma.note.update({
              where: { id: noteId },
              data: {
                imageUrl: `https://example.com/images/${noteId}.jpg`,
              },
            }),
          { jobId, noteId, operation: "update_note_image_url" }
        );

        // Add completion status event with error handling
        await ErrorHandler.withErrorHandling(
          () =>
            addStatusEventAndBroadcast({
              noteId,
              status: "COMPLETED",
              message: "Image uploaded successfully",
              context: "image upload",
            }),
          { jobId, noteId, operation: "add_completion_status" }
        );

        // Image processing job completed successfully
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
              message: `Image upload failed: ${jobError.message}`,
              context: "image upload",
            });
          } catch (statusError) {
            console.error("Failed to add failure status event:", statusError);
          }

          // Determine if job should be retried
          if (ErrorHandler.shouldRetry(jobError, retryCount)) {
            const backoffDelay = ErrorHandler.calculateBackoff(retryCount);
            console.log(
              `Scheduling retry for image job ${jobId} in ${backoffDelay}ms`
            );
            throw error; // Re-throw for BullMQ retry
          } else {
            console.log(
              `Image job ${jobId} failed permanently after ${retryCount + 1} attempts`
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
    },
    {
      connection: redisConnection,
      concurrency: 2, // Limit concurrent image processing
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Image processing job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    const errorMessage =
      err instanceof QueueError ? err.jobError.message : err.message;
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

  return worker;
}

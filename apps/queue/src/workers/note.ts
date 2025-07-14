import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { parseHTML } from "../parsers/html";
import { createNote } from "@peas/database";
import { addStatusEventAndBroadcast } from "../utils/status-broadcaster";
import {
  imageQueue,
  ingredientQueue,
  instructionQueue,
  categorizationQueue,
} from "../queues";
import { ErrorHandler, QueueError } from "../utils";
import { ErrorType, ErrorSeverity, NoteJobData } from "../types";
import { HealthMonitor } from "../utils/health-monitor";

export function setupNoteWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async (job) => {
      const jobId = job.id;
      const retryCount = job.attemptsMade;

      // Processing note job

      try {
        // Validate job data
        const validationError = ErrorHandler.validateJobData<NoteJobData>(
          job.data,
          ["content"]
        );

        if (validationError) {
          validationError.jobId = jobId;
          validationError.queueName = queue.name;
          validationError.retryCount = retryCount;
          ErrorHandler.logError(validationError);
          throw new QueueError(validationError);
        }

        const { content } = job.data as NoteJobData;

        // Check service health before processing
        const healthMonitor = HealthMonitor.getInstance();
        const isHealthy = await healthMonitor.isHealthy();

        if (!isHealthy) {
          const healthError = ErrorHandler.createJobError(
            "Service is unhealthy, skipping job processing",
            ErrorType.EXTERNAL_SERVICE_ERROR,
            ErrorSeverity.HIGH,
            { jobId, queueName: queue.name, retryCount }
          );
          ErrorHandler.logError(healthError);
          throw new QueueError(healthError);
        }

        // Parse HTML with error handling
        const file = await ErrorHandler.withErrorHandling(
          async () => parseHTML(content),
          { jobId, operation: "parse_html" }
        );

        // Create note with error handling
        const note = await ErrorHandler.withErrorHandling(
          async () => createNote(file),
          { jobId, operation: "create_note" }
        );

        // Add status event with error handling
        await ErrorHandler.withErrorHandling(
          () =>
            addStatusEventAndBroadcast({
              noteId: note.id,
              status: "PROCESSING",
              message: `Added note "${file.title}"`,
              context: "import",
            }),
          { jobId, noteId: note.id, operation: "add_status_event" }
        );

        // Queue sub-tasks with error handling
        const subTasks = [
          {
            queue: ingredientQueue,
            name: "parse-ingredients",
            data: { note },
            priority: 1,
          },
          {
            queue: instructionQueue,
            name: "parse-instructions",
            data: { note },
            priority: 1,
          },
          {
            queue: imageQueue,
            name: "process-image",
            data: { noteId: note.id, file },
            priority: 2,
          },
          {
            queue: categorizationQueue,
            name: "categorize-recipe",
            data: { noteId: note.id, file },
            priority: 3,
          },
        ];

        // Add sub-tasks with individual error handling
        for (const task of subTasks) {
          try {
            await task.queue.add(task.name, task.data, {
              priority: task.priority,
            });
          } catch (error) {
            const subTaskError = ErrorHandler.createJobError(
              error as Error,
              ErrorType.REDIS_ERROR,
              ErrorSeverity.MEDIUM,
              {
                jobId,
                subTask: task.name,
                queueName: task.queue.name,
                operation: "add_sub_task",
              }
            );
            ErrorHandler.logError(subTaskError);
            // Don't throw here - continue with other sub-tasks
          }
        }

        // Note processing job completed successfully
      } catch (error) {
        // Handle structured errors
        if (error instanceof QueueError) {
          const jobError = error.jobError;
          jobError.jobId = jobId;
          jobError.queueName = queue.name;
          jobError.retryCount = retryCount;

          ErrorHandler.logError(jobError);

          // Determine if job should be retried
          if (ErrorHandler.shouldRetry(jobError, retryCount)) {
            const backoffDelay = ErrorHandler.calculateBackoff(retryCount);
            console.log(
              `Scheduling retry for job ${jobId} in ${backoffDelay}ms`
            );
            throw error; // Re-throw for BullMQ retry
          } else {
            console.log(
              `Job ${jobId} failed permanently after ${retryCount + 1} attempts`
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
      concurrency: 5, // Process multiple notes simultaneously
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Note processing job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    const errorMessage =
      err instanceof QueueError ? err.jobError.message : err.message;
    console.error(
      `❌ Note processing job ${job?.id ?? "unknown"} failed:`,
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

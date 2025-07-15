import { Queue, Job } from "bullmq";
import { prisma, Note } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { parse as Parser } from "@peas/parser";
import { ErrorHandler, QueueError } from "../../utils";
import { ErrorType, ErrorSeverity, IngredientJobData } from "../../types";
import { HealthMonitor } from "../../utils/health-monitor";

export async function processIngredientJob(
  job: Job,
  queue: Queue
): Promise<void> {
  const jobId = job.id;
  const retryCount = job.attemptsMade;

  console.log(`Processing ingredient job ${jobId} (attempt ${retryCount + 1})`);

  try {
    // Validate job data
    const validationError = ErrorHandler.validateJobData<IngredientJobData>(
      job.data,
      ["note"]
    );

    if (validationError) {
      validationError.jobId = jobId;
      validationError.queueName = queue.name;
      validationError.retryCount = retryCount;
      ErrorHandler.logError(validationError);
      throw new QueueError(validationError);
    }

    const { note } = job.data as IngredientJobData;

    // Check service health before processing
    const healthMonitor = HealthMonitor.getInstance();
    const isHealthy = await healthMonitor.isHealthy();

    if (!isHealthy) {
      const healthError = ErrorHandler.createJobError(
        "Service is unhealthy, skipping ingredient processing",
        ErrorType.EXTERNAL_SERVICE_ERROR,
        ErrorSeverity.HIGH,
        { jobId, queueName: queue.name, retryCount }
      );
      ErrorHandler.logError(healthError);
      throw new QueueError(healthError);
    }

    const parsedIngredientLines =
      (note as Note & { parsedIngredientLines?: any[] })
        .parsedIngredientLines ?? [];
    let errorCount = 0;
    const total = parsedIngredientLines.length;
    let current = 0;

    // Batch size for database operations
    const BATCH_SIZE = 10;
    const updatePromises: Promise<any>[] = [];
    const statusEvents: Promise<any>[] = [];

    for (const line of parsedIngredientLines) {
      let parseStatus: "CORRECT" | "ERROR" = "CORRECT";

      try {
        // Parse ingredient with error handling
        await ErrorHandler.withErrorHandling(() => Parser(line.reference, {}), {
          jobId,
          noteId: note.id,
          lineId: line.id,
          operation: "parse_ingredient",
        });

        // Parsed ingredient successfully
      } catch (parseError) {
        errorCount += 1;
        parseStatus = "ERROR";

        const parseJobError = ErrorHandler.createJobError(
          parseError as Error,
          ErrorType.PARSING_ERROR,
          ErrorSeverity.LOW,
          {
            jobId,
            noteId: note.id,
            lineId: line.id,
            reference: line.reference,
            operation: "parse_ingredient",
          }
        );
        ErrorHandler.logError(parseJobError);

        console.error(`❌ Failed to parse ingredient: ${line.reference}`);
      }

      current += 1;

      // Batch database updates with error handling
      updatePromises.push(
        ErrorHandler.withErrorHandling(
          () =>
            prisma.parsedIngredientLine.update({
              where: { id: line.id },
              data: { parseStatus },
            }),
          {
            jobId,
            noteId: note.id,
            lineId: line.id,
            operation: "update_ingredient_line",
          }
        )
      );

      // Batch status events (only send every BATCH_SIZE or at the end)
      if (current % BATCH_SIZE === 0 || current === total) {
        statusEvents.push(
          ErrorHandler.withErrorHandling(
            () =>
              addStatusEventAndBroadcast({
                noteId: note.id,
                status: "PROCESSING",
                message: `...[${Math.round((current / total) * 100)}%] Processed ${current} of ${total} ingredient lines.`,
                context: "ingredient line parsing",
                currentCount: current,
                totalCount: total,
              }),
            { jobId, noteId: note.id, operation: "add_progress_status" }
          )
        );
      }

      // Execute batches to avoid memory buildup
      if (updatePromises.length >= BATCH_SIZE) {
        try {
          await Promise.all(updatePromises);
          updatePromises.length = 0; // Clear array
        } catch (batchError) {
          const batchJobError = ErrorHandler.createJobError(
            batchError as Error,
            ErrorType.DATABASE_ERROR,
            ErrorSeverity.MEDIUM,
            {
              jobId,
              noteId: note.id,
              operation: "batch_update_ingredients",
            }
          );
          ErrorHandler.logError(batchJobError);

          // Continue processing other batches
          updatePromises.length = 0;
        }
      }
    }

    // Execute remaining updates and status events with error handling
    await ErrorHandler.withErrorHandling(
      () =>
        Promise.all([
          ...updatePromises,
          ...statusEvents,
          // Update note's parsingErrorCount in a single operation
          prisma.note.update({
            where: { id: note.id },
            data: { parsingErrorCount: errorCount },
          }),
        ]),
      {
        jobId,
        noteId: note.id,
        operation: "finalize_ingredient_processing",
      }
    );

    // Add completion status event with error handling
    if (errorCount > 0) {
      await ErrorHandler.withErrorHandling(
        () =>
          addStatusEventAndBroadcast({
            noteId: note.id,
            status: "COMPLETED",
            message: `Finished ingredient parsing with ${errorCount} errors`,
            context: "ingredient line parsing",
          }),
        { jobId, noteId: note.id, operation: "add_completion_status" }
      );
    } else {
      // Add completion status event for successful parsing
      await ErrorHandler.withErrorHandling(
        () =>
          addStatusEventAndBroadcast({
            noteId: note.id,
            status: "COMPLETED",
            message: "Ingredient parsing completed successfully",
            context: "ingredient line parsing",
          }),
        { jobId, noteId: note.id, operation: "add_completion_status" }
      );
    }

    console.log(`Ingredient processing job ${jobId} completed successfully`);
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
          noteId: job.data.note.id,
          status: "FAILED",
          message: `Ingredient parsing failed: ${jobError.message}`,
          context: "ingredient line parsing",
        });
      } catch (statusError) {
        console.error("Failed to add failure status event:", statusError);
      }

      // Determine if job should be retried
      if (ErrorHandler.shouldRetry(jobError, retryCount)) {
        const backoffDelay = ErrorHandler.calculateBackoff(retryCount);
        console.log(
          `Scheduling retry for ingredient job ${jobId} in ${backoffDelay}ms`
        );
        throw error; // Re-throw for BullMQ retry
      } else {
        console.log(
          `Ingredient job ${jobId} failed permanently after ${retryCount + 1} attempts`
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

import { Job, Queue } from "bullmq";
import { prisma } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler, QueueError } from "../../utils";
import { ErrorType, ErrorSeverity, InstructionJobData } from "../../types";
import { HealthMonitor } from "../../utils/health-monitor";
import { validateJobData } from "../../utils/error-handler";
import { InstructionWorkerDependencies } from "./types";

export async function processInstructionJob(
  job: Job,
  queue: Queue,
  _deps: InstructionWorkerDependencies
): Promise<void> {
  const jobId = job.id;
  const retryCount = job.attemptsMade;

  console.log(
    `Processing instruction job ${jobId} (attempt ${retryCount + 1})`
  );

  try {
    // Validate job data
    const validationError = validateJobData(job.data);
    if (validationError) {
      (validationError as any).jobId = jobId;
      (validationError as any).queueName = queue.name;
      (validationError as any).retryCount = retryCount;
      ErrorHandler.logError(validationError);
      throw new QueueError(validationError);
    }

    const { note } = job.data as InstructionJobData;
    const { parsedInstructionLines = [] } = note as {
      parsedInstructionLines?: any[];
    };

    // Check service health before processing
    const healthMonitor = HealthMonitor.getInstance();
    const isHealthy = await healthMonitor.isHealthy();

    if (!isHealthy) {
      const healthError = ErrorHandler.createJobError(
        "Service is unhealthy, skipping instruction processing",
        ErrorType.EXTERNAL_SERVICE_ERROR,
        ErrorSeverity.HIGH,
        { jobId, queueName: queue.name, retryCount }
      );
      ErrorHandler.logError(healthError);
      throw new QueueError(healthError);
    }

    let errorCount = 0;
    const total = parsedInstructionLines.length;
    let current = 0;

    // Batch size for database operations
    const BATCH_SIZE = 10;
    const updatePromises: Promise<any>[] = [];
    const statusEvents: Promise<any>[] = [];

    for (const line of parsedInstructionLines) {
      let parseStatus: "CORRECT" | "ERROR" = "CORRECT";

      try {
        // For now, just mark as CORRECT (no parser yet)
        // In the future, this would call an instruction parser
        await ErrorHandler.withErrorHandling(
          () => Promise.resolve(), // Placeholder for future parser
          {
            jobId,
            noteId: note.id,
            lineId: line.id,
            operation: "parse_instruction",
          }
        );

        // Parsed instruction successfully
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
            originalText: line.originalText,
            operation: "parse_instruction",
          }
        );
        ErrorHandler.logError(parseJobError);

        console.error(`❌ Failed to parse instruction: ${line.originalText}`);
      }

      current += 1;

      // Batch database updates with error handling
      updatePromises.push(
        ErrorHandler.withErrorHandling(
          () =>
            prisma.parsedInstructionLine.update({
              where: { id: line.id },
              data: { parseStatus },
            }),
          {
            jobId,
            noteId: note.id,
            lineId: line.id,
            operation: "update_instruction_line",
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
                message: `...[${Math.round((current / total) * 100)}%] Processed ${current} of ${total} instruction lines.`,
                context: "instruction line parsing",
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
              operation: "batch_update_instructions",
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
      () => Promise.all([...updatePromises, ...statusEvents]),
      {
        jobId,
        noteId: note.id,
        operation: "finalize_instruction_processing",
      }
    );

    // Add completion status event with error handling
    if (errorCount > 0) {
      await ErrorHandler.withErrorHandling(
        () =>
          addStatusEventAndBroadcast({
            noteId: note.id,
            status: "COMPLETED",
            message: `Finished instruction parsing with ${errorCount} errors`,
            context: "instruction line parsing",
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
            message: "Instruction parsing completed successfully",
            context: "instruction line parsing",
          }),
        { jobId, noteId: note.id, operation: "add_completion_status" }
      );
    }

    console.log(`Instruction processing job ${jobId} completed successfully`);
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
          message: `Instruction parsing failed: ${jobError.message}`,
          context: "instruction line parsing",
        });
      } catch (statusError) {
        console.error("Failed to add failure status event:", statusError);
      }

      // Determine if job should be retried
      if (ErrorHandler.shouldRetry(jobError, retryCount)) {
        const backoffDelay = ErrorHandler.calculateBackoff(retryCount);
        console.log(
          `Scheduling retry for instruction job ${jobId} in ${backoffDelay}ms`
        );
        throw error; // Re-throw for BullMQ retry
      } else {
        console.log(
          `Instruction job ${jobId} failed permanently after ${retryCount + 1} attempts`
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

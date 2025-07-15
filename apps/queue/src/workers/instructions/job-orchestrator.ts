import { Job, Queue } from "bullmq";
import { prisma } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { ErrorType, ErrorSeverity, InstructionJobData } from "../../types";
import { InstructionWorkerDependencies } from "./types";
import {
  extractJobContext,
  validateJobDataAndHealth,
  handleJobError,
} from "../common/job-processing";

export async function processInstructionJob(
  job: Job,
  queue: Queue,
  _deps: InstructionWorkerDependencies
): Promise<void> {
  const { jobId, retryCount } = extractJobContext(job, queue);

  console.log(
    `Processing instruction job ${jobId} (attempt ${retryCount + 1})`
  );

  try {
    // Validate job data and check health
    await validateJobDataAndHealth<InstructionJobData>(
      job,
      queue,
      ["note"],
      "instruction processing"
    );

    const { note } = job.data as InstructionJobData;
    const { parsedInstructionLines = [] } = note as {
      parsedInstructionLines?: any[];
    };

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
    await handleJobError(error, job, queue, "instruction line parsing");
  }
}

import { Queue, Job } from "bullmq";
import { prisma } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { IngredientProcessor } from "./processor";
import { ErrorHandler } from "../../utils/error-handler";
import { ErrorType, ErrorSeverity, IngredientJobData } from "../../types";
import {
  extractJobContext,
  validateJobDataAndHealth,
  handleJobError,
} from "../common/job-processing";

// Local type for what we expect in parsedIngredientLines
interface IngredientLineWithId {
  id: string;
  reference: string;
}

const BATCH_SIZE = 10;

export async function processIngredientJob(
  job: Job,
  queue: Queue
): Promise<void> {
  const { jobId, retryCount } = extractJobContext(job, queue);
  console.log(`Processing ingredient job ${jobId} (attempt ${retryCount + 1})`);

  try {
    await validateJobDataAndHealth<IngredientJobData>(
      job,
      queue,
      ["note"],
      "ingredient processing"
    );

    const { note } = job.data as IngredientJobData;
    const parsedIngredientLines: IngredientLineWithId[] = Array.isArray(
      (note as any).parsedIngredientLines
    )
      ? (note as any).parsedIngredientLines.filter(
          (l: any) =>
            l && typeof l.id === "string" && typeof l.reference === "string"
        )
      : [];
    const total = parsedIngredientLines.length;
    let errorCount = 0;
    let current = 0;
    let updateBatch: Promise<any>[] = [];
    const statusBatch: Promise<any>[] = [];

    for (const line of parsedIngredientLines) {
      const parseStatus = await parseAndUpdateIngredientLine(
        line,
        note,
        jobId,
        updateBatch
      );
      if (parseStatus === "ERROR") errorCount++;
      current++;

      if (current % BATCH_SIZE === 0 || current === total) {
        statusBatch.push(batchStatusUpdate(note, jobId, current, total));
      }
      if (updateBatch.length >= BATCH_SIZE) {
        await flushBatch(updateBatch, jobId, note.id);
        updateBatch = [];
      }
    }

    await finalizeIngredientProcessing(
      note,
      errorCount,
      updateBatch,
      statusBatch,
      jobId,
      total
    );
    console.log(`Ingredient processing job ${jobId} completed successfully`);
  } catch (error) {
    throw await handleJobError(error, job, queue, "ingredient line parsing");
  }
}

async function parseAndUpdateIngredientLine(
  line: IngredientLineWithId,
  note: { id: string },
  jobId: string,
  updateBatch: Promise<any>[]
): Promise<"CORRECT" | "ERROR"> {
  let parseStatus: "CORRECT" | "ERROR" = "CORRECT";

  try {
    parseStatus = await IngredientProcessor.parseIngredientLine({
      reference: line.reference,
      id: line.id,
    });
  } catch (parseError) {
    parseStatus = "ERROR";

    const parseJobError = ErrorHandler.createJobError(
      parseError as Error,
      ErrorType.PARSING_ERROR,
      ErrorSeverity.LOW,
      {
        jobId,
        noteId: note.id,
        lineId: line.id,
        originalText: line.reference,
        operation: "parse_ingredient",
      }
    );
    ErrorHandler.logError(parseJobError);

    console.error(`❌ Failed to parse ingredient: ${line.reference}`);
  }

  updateBatch.push(
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
  return parseStatus;
}

function batchStatusUpdate(
  note: { id: string },
  jobId: string,
  current: number,
  total: number
): Promise<any> {
  return ErrorHandler.withErrorHandling(
    () =>
      addStatusEventAndBroadcast({
        noteId: note.id,
        status: "PROCESSING",
        message: IngredientProcessor.getProgressMessage(current, total),
        context: "ingredient line parsing",
        currentCount: current,
        totalCount: total,
      }),
    { jobId, noteId: note.id, operation: "add_progress_status" }
  );
}

async function finalizeIngredientProcessing(
  note: { id: string },
  errorCount: number,
  updateBatch: Promise<any>[],
  statusBatch: Promise<any>[],
  jobId: string,
  total: number
) {
  await ErrorHandler.withErrorHandling(
    () =>
      Promise.all([
        ...updateBatch,
        ...statusBatch,
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

  await ErrorHandler.withErrorHandling(
    () =>
      addStatusEventAndBroadcast({
        noteId: note.id,
        status: "COMPLETED",
        message: IngredientProcessor.getCompletionMessage({
          errorCount,
          total,
          successCount: total - errorCount,
        }),
        context: "ingredient line parsing",
      }),
    { jobId, noteId: note.id, operation: "add_completion_status" }
  );
}

async function flushBatch(
  batch: Promise<any>[],
  jobId: string,
  noteId: string
) {
  try {
    await Promise.all(batch);
  } catch (batchError) {
    const batchJobError = ErrorHandler.createJobError(
      batchError as Error,
      ErrorType.DATABASE_ERROR,
      ErrorSeverity.MEDIUM,
      {
        jobId,
        noteId,
        operation: "batch_update_ingredients",
      }
    );
    ErrorHandler.logError(batchJobError);
  }
}

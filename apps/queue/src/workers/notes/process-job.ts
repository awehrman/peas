import { NoteWorkerDependencies } from "./types";
import { Queue, Job } from "bullmq";
import { validateNoteJobData, checkServiceHealth } from "./validation";
import { queueSubTasks } from "./subtask-queues";
import { QueueError } from "../../utils/error-handler";
import {
  ErrorType,
  ErrorSeverity,
  NoteJobData,
  ParsedHTMLFile,
} from "../../types";
import { NoteWithParsedLines } from "@peas/database";

export async function processNote(
  content: string,
  jobId: string,
  deps: Pick<
    NoteWorkerDependencies,
    "parseHTML" | "createNote" | "ErrorHandler"
  >
): Promise<{ note: NoteWithParsedLines; file: ParsedHTMLFile }> {
  const file = await deps.ErrorHandler.withErrorHandling(
    async () => deps.parseHTML(content),
    { jobId, operation: "parse_html" }
  );
  const note = await deps.ErrorHandler.withErrorHandling(
    async () => deps.createNote(file),
    { jobId, operation: "create_note" }
  );
  return { note, file };
}

export async function addNoteStatusEvent(
  note: { id: string },
  file: { title: string },
  jobId: string,
  deps: Pick<
    NoteWorkerDependencies,
    "addStatusEventAndBroadcast" | "ErrorHandler"
  >
): Promise<void> {
  await deps.ErrorHandler.withErrorHandling(
    () =>
      deps.addStatusEventAndBroadcast({
        noteId: note.id,
        status: "PROCESSING",
        message: `Added note "${file.title}"`,
        context: "import",
      }),
    { jobId, noteId: note.id, operation: "add_status_event" }
  );
}

export async function processNoteJob(
  job: Job,
  queue: Queue,
  deps: NoteWorkerDependencies
): Promise<void> {
  const jobId = job.id ?? "unknown";
  const retryCount = job.attemptsMade;

  try {
    const validationError = validateNoteJobData(job.data, deps.ErrorHandler);

    if (validationError) {
      validationError.jobId = jobId;
      validationError.queueName = queue.name;
      validationError.retryCount = retryCount;
      deps.ErrorHandler.logError(validationError);
      throw new QueueError(validationError);
    }

    const { content } = job.data as NoteJobData;

    const isHealthy = await checkServiceHealth(deps.HealthMonitor);

    if (!isHealthy) {
      const healthError = deps.ErrorHandler.createJobError(
        "Service is unhealthy, skipping job processing",
        ErrorType.EXTERNAL_SERVICE_ERROR,
        ErrorSeverity.HIGH,
        { jobId, queueName: queue.name, retryCount }
      );
      deps.ErrorHandler.logError(healthError);
      throw new QueueError(healthError);
    }

    const { note, file } = await processNote(content, jobId, deps);

    await addNoteStatusEvent(note, file, jobId, deps);

    await queueSubTasks(note, file, jobId, deps);
  } catch (error) {
    if (error instanceof QueueError) {
      const jobError = error.jobError;
      jobError.jobId = jobId;
      jobError.queueName = queue.name;
      jobError.retryCount = retryCount;

      deps.ErrorHandler.logError(jobError);

      if (deps.ErrorHandler.shouldRetry(jobError, retryCount)) {
        const backoffDelay = deps.ErrorHandler.calculateBackoff(retryCount);
        deps.logger?.log(
          `Scheduling retry for job ${jobId} in ${backoffDelay}ms`
        );
        throw error; // Re-throw for BullMQ retry
      } else {
        deps.logger?.log(
          `Job ${jobId} failed permanently after ${retryCount + 1} attempts`
        );
        throw error;
      }
    }

    const unexpectedError = deps.ErrorHandler.classifyError(error as Error);
    unexpectedError.jobId = jobId;
    unexpectedError.queueName = queue.name;
    unexpectedError.retryCount = retryCount;

    deps.ErrorHandler.logError(unexpectedError);
    throw new QueueError(unexpectedError);
  }
}

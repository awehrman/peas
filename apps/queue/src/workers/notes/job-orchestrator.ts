import { NoteWorkerDependencies } from "./types";
import { Queue, Job } from "bullmq";
import { queueFollowUpProcessingTasks } from "./follow-up-tasks";

import { NoteJobData, ParsedHTMLFile } from "../../types";
import { NoteWithParsedLines } from "@peas/database";
import {
  extractJobContext,
  validateJobDataAndHealth,
  handleJobError,
} from "../common/job-processing";

export async function parseAndCreateNote(
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

export async function broadcastNoteProcessingStatus(
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
  const { jobId, retryCount } = extractJobContext(job, queue);

  console.log(`Processing note job ${jobId} (attempt ${retryCount + 1})`);

  try {
    // Validate job data and check health
    await validateJobDataAndHealth<NoteJobData>(
      job,
      queue,
      ["content"],
      "note processing"
    );

    const { content } = job.data as NoteJobData;

    // Process the note
    const { note, file } = await parseAndCreateNote(content, jobId, deps);

    // Broadcast status and queue follow-up tasks
    await broadcastNoteProcessingStatus(note, file, jobId, deps);
    await queueFollowUpProcessingTasks(note, file, jobId, deps);

    console.log(`Note processing job ${jobId} completed successfully`);
  } catch (error) {
    await handleJobError(error, job, queue, "note processing");
  }
}

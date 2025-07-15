import { Job, Queue } from "bullmq";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { CategorizationJobData } from "../../types";
import { CategorizationProcessor } from "./processor";
import {
  extractJobContext,
  validateJobDataAndHealth,
  handleJobError,
} from "../common/job-processing";

export async function processCategorizationJob(
  job: Job,
  queue: Queue
): Promise<void> {
  const { jobId, retryCount } = extractJobContext(job, queue);

  console.log(
    `Processing categorization job ${jobId} (attempt ${retryCount + 1})`
  );

  try {
    // Validate job data and check health
    await validateJobDataAndHealth<CategorizationJobData>(
      job,
      queue,
      ["noteId", "file"],
      "categorization processing"
    );

    const { noteId } = job.data as CategorizationJobData;

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
    await handleJobError(error, job, queue, "categorization");
  }
}

import { Queue, Job } from "bullmq";
import { prisma } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { ErrorType, ErrorSeverity, ImageJobData } from "../../types";
import { ImageProcessor, IMAGE_PROCESSING_STEPS } from "./processor";
import {
  extractJobContext,
  validateJobDataAndHealth,
  handleJobError,
} from "../common/job-processing";

const STATUS_UPDATE_INTERVAL = 2; // Only send status every N steps

export async function processImageJob(job: Job, queue: Queue): Promise<void> {
  const { jobId, retryCount } = extractJobContext(job, queue);

  console.log(`Processing image job ${jobId} (attempt ${retryCount + 1})`);

  try {
    // Validate job data and check health
    await validateJobDataAndHealth<ImageJobData>(
      job,
      queue,
      ["noteId", "file"],
      "image processing"
    );

    const { noteId } = job.data as ImageJobData;

    // Add initial status event with error handling
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
      const step = IMAGE_PROCESSING_STEPS[i]!;

      try {
        // Process image step with error handling
        await ErrorHandler.withErrorHandling(
          () => ImageProcessor.processImageStep(step, i, noteId),
          { jobId, noteId, step: step.name, operation: "image_processing_step" }
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
                message: ImageProcessor.getStepProgressMessage(step, i),
                context: "image upload",
                currentCount: i + 1,
                totalCount: IMAGE_PROCESSING_STEPS.length,
              }),
            { jobId, noteId, step: step.name, operation: "add_progress_status" }
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
            step: step.name,
            stepIndex: i,
            operation: "image_processing_step",
          }
        );
        ErrorHandler.logError(stepJobError);

        // Continue with next step instead of failing entire job
        console.warn(
          `⚠️ Image processing step failed: ${step.name}, continuing with next step`
        );
      }
    }

    // Update note with image URL with error handling
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

    console.log(`Image processing job ${jobId} completed successfully`);
  } catch (error) {
    await handleJobError(error, job, queue, "image upload");
  }
}

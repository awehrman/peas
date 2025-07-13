import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma, addStatusEvent } from "@peas/database";
import { ParsedHTMLFile } from "../types";

const IMAGE_PROCESSING_STEPS = [
  "Extracting image from HTML content",
  "Validating image format",
  "Compressing image for storage",
  "Uploading to cloud storage",
  "Generating thumbnail",
] as const;

const PROCESSING_DELAY_MS = 500;

export function setupImageWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({
      data: { noteId, file },
    }: {
      data: { noteId: string; file: ParsedHTMLFile };
    }) => {
      console.log("Processing image...");

      try {
        await addStatusEvent({
          noteId,
          status: "PROCESSING",
          message: "Starting image upload process...",
          context: "image upload",
        });

        // Process each step with progress tracking
        for (let i = 0; i < IMAGE_PROCESSING_STEPS.length; i++) {
          const step = IMAGE_PROCESSING_STEPS[i];
          const progress = Math.round(
            ((i + 1) / IMAGE_PROCESSING_STEPS.length) * 100
          );

          // Simulate processing time
          await new Promise((resolve) =>
            setTimeout(resolve, PROCESSING_DELAY_MS)
          );

          await addStatusEvent({
            noteId,
            status: "PROCESSING",
            message: `...[${progress}%] ${step}`,
            context: "image upload",
            currentCount: i + 1,
            totalCount: IMAGE_PROCESSING_STEPS.length,
          });
        }

        // Update note with mock image URL
        await prisma.note.update({
          where: { id: noteId },
          data: {
            imageUrl: `https://example.com/images/${noteId}.jpg`,
          },
        });

        await addStatusEvent({
          noteId,
          status: "COMPLETED",
          message: "Image uploaded successfully",
          context: "image upload",
        });
      } catch (error) {
        console.error("Image processing failed:", error);
        await addStatusEvent({
          noteId,
          status: "FAILED",
          message: `Image upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          context: "image upload",
        });
        throw error;
      }
    },
    {
      connection: redisConnection,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Image processing job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Image processing job ${job?.id ?? "unknown"} failed:`,
      err.message
    );
  });

  return worker;
}

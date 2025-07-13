import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { parseHTML } from "../parsers/html";
import { createNote, addStatusEvent } from "@peas/database";
import {
  imageQueue,
  ingredientQueue,
  instructionQueue,
  categorizationQueue,
} from "../queues";

export function setupNoteWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({ data: { content = "" } }) => {
      console.log("Processing note...");

      try {
        // Parse HTML and create note
        const file = parseHTML(content);
        const note = await createNote(file);

        await addStatusEvent({
          noteId: note.id,
          status: "PROCESSING",
          message: `Added note "${file.title}" - Starting parallel processing`,
          context: "import",
        });

        // Fire-and-forget: do not await sub-tasks
        ingredientQueue.add("parse-ingredients", { note }, { priority: 1 });
        instructionQueue.add("parse-instructions", { note }, { priority: 1 });
        imageQueue.add(
          "process-image",
          { noteId: note.id, file },
          { priority: 2 }
        );
        categorizationQueue.add(
          "categorize-recipe",
          { noteId: note.id, file },
          { priority: 3 }
        );

        // Optionally, emit a status event that all sub-tasks have been queued
        await addStatusEvent({
          noteId: note.id,
          status: "PROCESSING",
          message: `Queued ${file.ingredients.length} ingredients, ${file.instructions.length} instructions for parallel processing`,
          context: "import",
        });
      } catch (error) {
        console.error("Note processing failed:", error);
        throw error; // Re-throw for BullMQ retry
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process multiple notes simultaneously
    }
  );

  worker.on("completed", (job) => {
    console.log(`Note processing job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Note processing job ${job?.id ?? "unknown"} failed:`,
      err.message
    );
  });

  return worker;
}

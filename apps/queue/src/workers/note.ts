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
          message: `Added note "${file.title}"`,
          context: "import",
        });

        // Queue all processing tasks in parallel
        await Promise.all([
          imageQueue.add("process-image", { noteId: note.id, file }),
          ingredientQueue.add("parse-ingredients", { note }),
          instructionQueue.add("parse-instructions", { note }),
          categorizationQueue.add("categorize-recipe", {
            noteId: note.id,
            file,
          }),
        ]);

        await addStatusEvent({
          noteId: note.id,
          status: "PROCESSING",
          message: `Queued ${file.ingredients.length} ingredients, ${file.instructions.length} instructions for processing`,
          context: "import",
        });
      } catch (error) {
        console.error("Note processing failed:", error);
        throw error; // Re-throw for BullMQ retry
      }
    },
    {
      connection: redisConnection,
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

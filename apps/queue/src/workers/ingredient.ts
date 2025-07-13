// Batching: DB updates and status events every 10 lines and at the end for performance.
// This reduces DB connection overhead and status event spam.
import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { NoteWithParsedLines, prisma, addStatusEvent } from "@peas/database";
import { parse as Parser } from "@peas/parser";

export function setupIngredientWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({ data: { note } }: { data: { note: NoteWithParsedLines } }) => {
      console.log("parsing ingredients...");
      const { parsedIngredientLines = [] } = note;
      let errorCount = 0;
      const total = parsedIngredientLines.length;
      let current = 0;

      // Batch size for database operations
      const BATCH_SIZE = 10;
      const updatePromises: Promise<any>[] = [];
      const statusEvents: Promise<any>[] = [];

      for (const line of parsedIngredientLines) {
        let message = `${line.reference}`;
        let parseStatus: "CORRECT" | "ERROR" = "CORRECT";

        try {
          const parsed = Parser(line.reference, {});
          message += " ✅";
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          message += " ❌";
          errorCount += 1;
          parseStatus = "ERROR";
        }
        console.log(message);

        current += 1;

        // Batch database updates
        updatePromises.push(
          prisma.parsedIngredientLine.update({
            where: { id: line.id },
            data: { parseStatus },
          })
        );

        // Batch status events (only send every BATCH_SIZE or at the end)
        if (current % BATCH_SIZE === 0 || current === total) {
          statusEvents.push(
            addStatusEvent({
              noteId: note.id,
              status: "PROCESSING",
              message: `...[${Math.round((current / total) * 100)}%] Processed ${current} of ${total} ingredient lines.`,
              context: "ingredient line parsing",
              currentCount: current,
              totalCount: total,
            })
          );
        }

        // Execute batches to avoid memory buildup
        if (updatePromises.length >= BATCH_SIZE) {
          await Promise.all(updatePromises);
          updatePromises.length = 0; // Clear array
        }
      }

      // Execute remaining updates and status events
      await Promise.all([
        ...updatePromises,
        ...statusEvents,
        // Update note's parsingErrorCount in a single operation
        prisma.note.update({
          where: { id: note.id },
          data: { parsingErrorCount: errorCount },
        }),
      ]);

      await addStatusEvent({
        noteId: note.id,
        status: "COMPLETED",
        message: `Finished ingredient parsing with ${errorCount} errors`,
        context: "ingredient line parsing",
      });
    },
    {
      connection: redisConnection,
      concurrency: 3, // Process multiple ingredient parsing jobs simultaneously
    }
  );

  worker.on("completed", (job) => {
    console.log(`Ingredient parsing job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Ingredient parsing job ${job?.id ?? job} failed with error ${err.message}`
    );
  });

  return worker;
}

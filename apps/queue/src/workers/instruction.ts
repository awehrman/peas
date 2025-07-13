// Batching: DB updates and status events every 10 lines and at the end for performance.
// This reduces DB connection overhead and status event spam.
import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { NoteWithParsedLines, prisma, addStatusEvent } from "@peas/database";

export function setupInstructionWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({ data: { note } }: { data: { note: NoteWithParsedLines } }) => {
      console.log("parsing instructions...");
      const { parsedInstructionLines = [] } = note;
      let errorCount = 0;
      const total = parsedInstructionLines.length;
      let current = 0;

      // Batch size for database operations
      const BATCH_SIZE = 10;
      const updatePromises: Promise<any>[] = [];
      const statusEvents: Promise<any>[] = [];

      for (const line of parsedInstructionLines) {
        let message = `${line.originalText}`;
        let parseStatus: "CORRECT" | "ERROR" = "CORRECT";

        try {
          // For now, just mark as CORRECT (no parser yet)
          message += " ✅";
          console.log(message);
        } catch {
          message += " ❌";
          errorCount += 1;
          parseStatus = "ERROR";
        }

        current += 1;

        // Batch database updates
        updatePromises.push(
          prisma.parsedInstructionLine.update({
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
              message: `...[${Math.round((current / total) * 100)}%] Processed ${current} of ${total} instruction lines.`,
              context: "instruction line parsing",
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
      await Promise.all([...updatePromises, ...statusEvents]);

      await addStatusEvent({
        noteId: note.id,
        status: "COMPLETED",
        message: `Finished instruction parsing with ${errorCount} errors`,
        context: "instruction line parsing",
      });
    },
    {
      connection: redisConnection,
      concurrency: 3, // Process multiple instruction parsing jobs simultaneously
    }
  );

  worker.on("completed", (job) => {
    console.log(`Instruction parsing job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Instruction parsing job ${job?.id ?? job} failed with error ${err.message}`
    );
  });

  return worker;
}

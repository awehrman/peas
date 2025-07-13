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

      for (const line of parsedInstructionLines) {
        let message = `${line.originalText}`;
        try {
          // For now, just mark as CORRECT (no parser yet)
          await prisma.parsedInstructionLine.update({
            where: { id: line.id },
            data: { parseStatus: "CORRECT" },
          });
          message += " ✅";
          console.log(message);
        } catch (err) {
          message += " ❌";
          errorCount += 1;
          await prisma.parsedInstructionLine.update({
            where: { id: line.id },
            data: { parseStatus: "ERROR" },
          });
        }

        current += 1;
        await addStatusEvent({
          noteId: note.id,
          status: "PROCESSING",
          message: `...[${Math.round((current / total) * 100)}%] Processed ${current} of ${total} instruction lines.`,
          context: "instruction line parsing",
          currentCount: current,
          totalCount: total,
        });
      }

      await addStatusEvent({
        noteId: note.id,
        status: "COMPLETED",
        message: `Finished instruction parsing with ${errorCount} errors`,
        context: "instruction line parsing",
      });
    },
    {
      connection: redisConnection,
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

import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { NoteWithParsedLines, prisma, addStatusEvent } from "@peas/database";
const Parser = require("@peas/parser");

export function setupIngredientWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({ data: { note } }: { data: { note: NoteWithParsedLines } }) => {
      console.log("parsing ingredients...");
      const { parsedIngredientLines = [] } = note;
      let errorCount = 0;
      const total = parsedIngredientLines.length;
      let current = 0;

      for (const line of parsedIngredientLines) {
        let message = `${line.reference}`;
        try {
          const parsed = Parser.parse(line.reference, {});
          message += " ✅";
          // update line as CORRECT
          await prisma.parsedIngredientLine.update({
            where: { id: line.id },
            data: { parseStatus: "CORRECT" },
          });
          console.log(JSON.stringify(parsed, null, 2));
        } catch (err) {
          message += " ❌";
          errorCount += 1;
          await prisma.parsedIngredientLine.update({
            where: { id: line.id },
            data: { parseStatus: "ERROR" },
          });
        }
        console.log(message);

        current += 1;
        await addStatusEvent({
          noteId: note.id,
          status: "PROCESSING",
          message: `...[${Math.round((current / total) * 100)}%] Processed ${current} of ${total} ingredient lines.`,
          context: "ingredient line parsing",
          currentCount: current,
          totalCount: total,
        });
      }
      console.log(`errorCount: ${errorCount}`);
      // update note's parsingErrorCount
      await prisma.note.update({
        where: { id: note.id },
        data: { parsingErrorCount: errorCount },
      });

      await addStatusEvent({
        noteId: note.id,
        status: "COMPLETED",
        message: `Finished ingredient parsing with ${errorCount} errors`,
        context: "ingredient line parsing",
      });
    },
    {
      connection: redisConnection,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Secondary job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Secondary job ${job?.id ?? job} failed with error ${err.message}`
    );
  });

  return worker;
}

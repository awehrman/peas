import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { NoteWithParsedLines } from "@peas/database";
const Parser = require("@peas/parser");

export function setupIngredientParserWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({ data: { note } }: { data: { note: NoteWithParsedLines } }) => {
      console.log("parsing ingredients...");
      const { parsedIngredientLines = [] } = note;
      for (const line of parsedIngredientLines) {
        let message = `${line.reference}`;
        try {
          const parsed = Parser.parse(line.reference, {});
          message += " ✅";
          console.log(JSON.stringify(parsed, null, 2));
        } catch (err) {
          message += " ❌";
        }
        console.log(message);
      }
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

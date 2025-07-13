import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { parseHTML } from "../parsers/html";
import { createNote } from "@peas/database";
import { parserQueue } from "../queues";

export function setupHTMLFileQueueProcessor(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({ data: { content = "" } }) => {
      console.log("processing file...");
      const file = parseHTML(content);
      const noteWithLines = await createNote(file);

      await parserQueue.add("parse-ingredients", {
        note: noteWithLines,
      });
    },
    {
      connection: redisConnection,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job?.id ?? "unknown"} has been completed`);
  });

  worker.on("failed", (job, err) => {
    console.log(
      `Job ${job?.id ?? "unknown"} has failed with error ${err.message}`
    );
  });

  return worker;
}

import express from "express";
import fs from "fs";
import path from "path";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import {
  createQueue,
  setupHTMLFileQueueProcessor,
  setupParsingQueueProcessor,
} from "./queue.js";

const app = express();
const port = process.env.PORT || 4200;
const directoryPath = path.join(process.cwd(), "/public/files");

const EVERNOTE_INDEX_FILE = "Evernote_index.html";

async function enqueueHtmlFiles() {
  fs.readdir(directoryPath, async (err, files) => {
    if (err) {
      return console.log("Unable to scan directory: " + err);
    }

    // Loop over the files and add them to the queue
    for (const file of files) {
      if (file.endsWith(".html") && file !== EVERNOTE_INDEX_FILE) {
        const filePath = path.join(directoryPath, file);
        console.log(filePath);
        const content = fs.readFileSync(filePath, "utf-8");

        await htmlNoteQueue.add("process-html", {
          content,
        });
        console.log(`Enqueued ${file}`);
      }
    }
  });
}

const htmlNoteQueue = createQueue("htmlNoteQueue");
setupHTMLFileQueueProcessor(htmlNoteQueue.name);

export const parserQueue = createQueue("parserQueue");
setupParsingQueueProcessor(parserQueue.name);

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(htmlNoteQueue)],
  serverAdapter,
});

serverAdapter.setBasePath("/bull-board");
app.use("/bull-board", serverAdapter.getRouter());

app.get("/import", (req, res) => {
  enqueueHtmlFiles();
  res.json({ success: true });
});

app.get("/health", (req, res) => {
  res.json({
    queues: {
      htmlNote: htmlNoteQueue.name,
      parser: parserQueue.name,
    },
    redis: {
      host: process.env.REDISHOST,
      port: process.env.REDISPORT,
    },
    directory: {
      path: directoryPath,
      exists: fs.existsSync(directoryPath),
      files: fs.existsSync(directoryPath) ? fs.readdirSync(directoryPath) : [],
    },
  });
});

app.get("/test-redis", async (req, res) => {
  try {
    await htmlNoteQueue.add(
      "test-job",
      { test: true },
      { removeOnComplete: true }
    );
    res.json({ success: true, message: "Redis connection successful" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Redis connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

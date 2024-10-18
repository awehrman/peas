import express from "express";
import fs from "fs";
import path from "path";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { createQueue, setupQueueProcessor } from "./queue";

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
setupQueueProcessor(htmlNoteQueue.name);

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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

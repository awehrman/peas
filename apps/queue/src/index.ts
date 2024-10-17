import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { createQueue, setupQueueProcessor } from "./queue";

const app = express();
const port = process.env.PORT || 3000;

const htmlNoteQueue = createQueue("htmlNoteQueue");
setupQueueProcessor(htmlNoteQueue.name);

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(htmlNoteQueue)],
  serverAdapter,
});

serverAdapter.setBasePath("/bull-board");
app.use("/bull-board", serverAdapter.getRouter());

app.get("/ping", (req, res) => {
  res.json({ pong: "it worked!" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import {
  noteQueue,
  imageQueue,
  ingredientQueue,
  instructionQueue,
  categorizationQueue,
} from "./queues";
import { importRouter, notesRouter, healthRouter } from "./routes";
import cors from "cors";

const app = express();
app.use(cors());
const port = process.env.PORT || 4200;

// Bull-Board setup
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(noteQueue),
    new BullMQAdapter(imageQueue),
    new BullMQAdapter(ingredientQueue),
    new BullMQAdapter(instructionQueue),
    new BullMQAdapter(categorizationQueue),
  ],
  serverAdapter,
});

serverAdapter.setBasePath("/bull-board");

// Middleware & routes
app.use(express.json());
app.use("/bull-board", serverAdapter.getRouter());
app.use("/import", importRouter);
app.use("/notes", notesRouter);
app.use("/health", healthRouter);

// Start server
app.listen(port, () => {
  console.log(`Queue service running at http://localhost:${port}`);
});

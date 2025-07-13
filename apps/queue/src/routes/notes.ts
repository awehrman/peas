import { Router, Request, Response } from "express";
import { noteQueue } from "../queues";

export const notesRouter = Router();

notesRouter.post("/", async (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "'content' must be a non-empty string" });
    return;
  }

  await noteQueue.add("process-note", { content });
  res.json({ queued: true });
});

import { Router, Request, Response } from "express";
import { noteQueue } from "../queues";
import { randomUUID } from "crypto";

export const notesRouter = Router();

notesRouter.post("/", async (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "'content' must be a non-empty string" });
    return;
  }

  // Generate a temporary importId for frontend grouping
  const importId = `import-${randomUUID()}`;

  await noteQueue.add("process-note", { content, importId });
  res.json({ queued: true, importId });
});

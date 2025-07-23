import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";

import { noteQueue } from "../queues";
import { ActionName } from "../types";

export const notesRouter = Router();

notesRouter.post("/", async (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "'content' must be a non-empty string" });
    return;
  }

  // Generate a temporary importId for frontend grouping
  const importId = `${randomUUID()}`;
  console.log("importId", importId);
  await noteQueue.add(ActionName.PARSE_HTML, {
    content,
    metadata: { importId },
  });
  res.json({ queued: true, importId });
});

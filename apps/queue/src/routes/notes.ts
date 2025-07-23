import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";

import { ServiceContainer } from "../services";
import { ActionName, HttpStatus } from "../types";

export const notesRouter = Router();

notesRouter.post("/", async (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== "string" || content.trim() === "") {
    res
      .status(HttpStatus.BAD_REQUEST)
      .json({ error: "'content' must be a non-empty string" });
    return;
  }

  // Generate a temporary importId for frontend grouping
  const importId = `${randomUUID()}`;
  console.log("importId", importId);

  const serviceContainer = await ServiceContainer.getInstance();
  const noteQueue = serviceContainer.queues.noteQueue;

  await noteQueue.add(ActionName.PARSE_HTML, {
    content,
    metadata: { importId },
  });
  res.json({ queued: true, importId });
});

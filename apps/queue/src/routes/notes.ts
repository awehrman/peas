import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";

import { ServiceContainer } from "../services";
import { ActionName, HttpStatus } from "../types";

export const notesRouter = Router();

interface NoteRequestBody {
  content: string;
  importId?: string;
  imageFiles?: Array<{
    name: string;
    type: string;
    size: number;
  }>;
}

notesRouter.post("/", async (req: Request, res: Response) => {
  console.log("[NOTES_ROUTE] POST /notes request received");
  console.log("[NOTES_ROUTE] Request body:", req.body);
  console.log("[NOTES_ROUTE] Content-Type:", req.get("Content-Type"));

  const { content, imageFiles } = req.body as NoteRequestBody;

  console.log("[NOTES_ROUTE] Extracted content length:", content?.length);
  console.log("[NOTES_ROUTE] Extracted imageFiles:", imageFiles);

  if (typeof content !== "string" || content.trim() === "") {
    /* istanbul ignore next -- @preserve */
    console.log("[NOTES_ROUTE] Invalid content - returning 400");
    res
      .status(HttpStatus.BAD_REQUEST)
      .json({ error: "'content' must be a non-empty string" });
    return;
  }

  // Accept importId from frontend or generate one
  const headerImportId = req.headers["x-import-id"];
  const importId =
    (typeof headerImportId === "string" ? headerImportId : undefined) ||
    (req.body as NoteRequestBody).importId ||
    randomUUID();
  console.log(
    "[NOTES_ROUTE] Using importId:",
    importId,
    typeof headerImportId === "string" ? "(from frontend)" : "(generated)"
  );

  const serviceContainer = await ServiceContainer.getInstance();
  const noteQueue = serviceContainer.queues.noteQueue;

  const jobData = {
    content,
    importId,
    imageFiles: imageFiles || [],
  };

  console.log("[NOTES_ROUTE] Adding job to noteQueue with data:", jobData);

  await noteQueue.add(ActionName.PARSE_HTML, jobData);

  console.log("[NOTES_ROUTE] Job added successfully, sending response");

  res.json({ queued: true, importId });
});

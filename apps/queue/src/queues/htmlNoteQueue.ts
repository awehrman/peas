import { createQueue } from "./createQueue";
import { setupHTMLFileQueueProcessor } from "../workers/htmlFileWorker";

export const htmlNoteQueue = createQueue("htmlNoteQueue");
// Attach worker
setupHTMLFileQueueProcessor(htmlNoteQueue);

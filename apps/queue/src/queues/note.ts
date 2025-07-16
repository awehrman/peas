import { createQueue } from "./createQueue";
import { createNoteWorker } from "../workers/note";
import { serviceContainer } from "../services/container";

export const noteQueue = createQueue("noteQueue");

// Create and start the note worker
createNoteWorker(noteQueue, serviceContainer);

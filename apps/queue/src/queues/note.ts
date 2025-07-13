import { createQueue } from "./createQueue";
import { setupNoteWorker } from "../workers/note";

export const noteQueue = createQueue("noteQueue");
setupNoteWorker(noteQueue);

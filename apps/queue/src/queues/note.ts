import { serviceContainer } from "../services/container";
import type { TypedQueue, NoteJobData, NoteActionName } from "../types";

export const noteQueue: TypedQueue<NoteJobData, NoteActionName> =
  serviceContainer.queues.noteQueue as TypedQueue<NoteJobData, NoteActionName>;

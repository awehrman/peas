import type { ActionName, TypedQueue } from "../types";
import type { NoteJobData } from "../types/notes";

// Note: This queue will be initialized when the service container is created
// The actual queue instance is available through ServiceContainer.getInstance().queues.noteQueue
export const noteQueue = null as unknown as TypedQueue<NoteJobData, ActionName>;

import type { NoteJobData } from "../services/actions/note/types";
import type { NoteActionName, TypedQueue } from "../types";

// Note: This queue will be initialized when the service container is created
// The actual queue instance is available through ServiceContainer.getInstance().queues.noteQueue
export const noteQueue = null as unknown as TypedQueue<
  NoteJobData,
  NoteActionName
>;

// Export service functions
export {
  initializeNoteCompletion,
  setTotalImageJobs,
  markImageJobCompleted,
  markWorkerCompleted,
  getNoteCompletionStatus,
  markNoteAsProcessing,
  markNoteAsFailed,
  cleanupNoteCompletion,
  markInstructionWorkerCompleted,
  markIngredientWorkerCompleted,
  markImageWorkerCompleted,
  setTotalIngredientLines,
  markIngredientLineCompleted,
  getIngredientCompletionStatus,
} from "./service";

// Export types
export type { NoteCompletionStatus } from "./service";

// Export actions
export { TrackCompletionAction } from "./action";
export { InitializeCompletionTrackingAction } from "./initialize-completion";
export { MarkWorkerCompletedAction, MarkNoteWorkerCompletedAction } from "./mark-worker-completed";
export { MarkNoteAsFailedAction } from "./mark-note-failed";

// Import the action class for convenience functions
import { MarkWorkerCompletedAction } from "./mark-worker-completed";

// Export convenience functions for creating specific worker completion actions
export function createMarkNoteWorkerCompletedAction() {
  return new MarkWorkerCompletedAction("note");
}

export function createMarkInstructionWorkerCompletedAction() {
  return new MarkWorkerCompletedAction("instruction");
}

export function createMarkIngredientWorkerCompletedAction() {
  return new MarkWorkerCompletedAction("ingredient");
}

export function createMarkImageWorkerCompletedAction() {
  return new MarkWorkerCompletedAction("image");
}

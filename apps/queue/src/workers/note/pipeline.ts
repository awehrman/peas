import type {
  NotePipelineAction,
  NoteWorkerDependencies,
} from "../../services/actions/note/types";
import { ActionName } from "../../types";

/**
 * Creates the action pipeline for note processing.
 * @param ctx - Context with action creation helpers and dependencies
 * @returns Array of note pipeline actions
 */
export function createNotePipeline(ctx: {
  createWrappedAction: (
    name: string,
    deps: NoteWorkerDependencies
  ) => NotePipelineAction;
  createErrorHandledAction: (
    name: string,
    deps: NoteWorkerDependencies
  ) => NotePipelineAction;
  dependencies: NoteWorkerDependencies;
}): NotePipelineAction[] {
  const { createWrappedAction, createErrorHandledAction, dependencies } = ctx;
  const actions: NotePipelineAction[] = [];

  // 1. Clean HTML (remove style and icons tags)
  actions.push(createWrappedAction(ActionName.CLEAN_HTML, dependencies));

  // 2. Parse HTML (with retry and error handling)
  actions.push(createWrappedAction(ActionName.PARSE_HTML, dependencies));

  // 3. Save note (with retry and error handling)
  actions.push(createWrappedAction(ActionName.SAVE_NOTE, dependencies));

  // 4. Schedule all follow-up processing tasks concurrently
  actions.push(
    createErrorHandledAction(
      ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
      dependencies
    )
  );

  return actions;
}

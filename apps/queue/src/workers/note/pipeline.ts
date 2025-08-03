import { ActionName } from "../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../types/notes";
import type { ActionFactory } from "../core/action-factory";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * Creates the action pipeline for note processing using the factory approach.
 * @param actionFactory - The action factory to create actions
 * @param dependencies - Worker dependencies
 * @param data - Pipeline data to determine conditional actions
 * @param context - Action context
 * @returns Array of note pipeline actions
 */
export function createNotePipeline(
  actionFactory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >,
  dependencies: NoteWorkerDependencies,
  data: NotePipelineData,
  _context: ActionContext
): WorkerAction<NotePipelineData, NoteWorkerDependencies, NotePipelineData>[] {
  const actions: WorkerAction<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >[] = [];

  // Always start with clean and parse
  actions.push(actionFactory.create(ActionName.CLEAN_HTML, dependencies));

  actions.push(actionFactory.create(ActionName.PARSE_HTML, dependencies));

  actions.push(actionFactory.create(ActionName.SAVE_NOTE, dependencies));

  // Conditionally add follow-up tasks based on options
  if (!data.options?.skipFollowupTasks) {
    // Schedule all followup tasks (source, images, ingredients, instructions)
    actions.push(
      actionFactory.create(ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS, dependencies)
    );
    
    // Check for duplicates after all tasks are scheduled
    actions.push(
      actionFactory.create(ActionName.CHECK_DUPLICATES, dependencies)
    );
  }

  return actions;
}

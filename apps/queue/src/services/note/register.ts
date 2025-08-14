import { ActionName } from "../../types";
import type { NotePipelineData } from "../../types/notes";
import type { NoteWorkerDependencies } from "../../types/notes";
import { ActionFactory } from "../../workers/core/action-factory";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

import { CheckDuplicatesAction } from "./actions/check-duplicates/action";
import { CleanHtmlAction } from "./actions/clean-html/action";
import { MarkNoteWorkerCompletedAction } from "./actions/mark-note-worker-completed/action";
import { ParseHtmlAction } from "./actions/parse-html/action";
import { ProcessSourceAction } from "./actions/process-source/action";
import { SaveNoteAction } from "./actions/save-note/action";
import { ScheduleImagesAction } from "./actions/schedule-images/action";
import { ScheduleInstructionsAction } from "./actions/schedule-instructions/action";
import { ScheduleAllFollowupTasksAction } from "./actions/schedule-tasks/action";
import { WaitForCategorizationAction } from "./actions/wait-for-categorization/action";

/**
 * Register all note actions in the given ActionFactory with type safety
 */
export function registerNoteActions(
  factory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >
): void {
  if (!factory || typeof factory !== "object") {
    throw new Error("Invalid factory");
  }
  registerActions(factory, [
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.PARSE_HTML, ParseHtmlAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.CLEAN_HTML, CleanHtmlAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.SAVE_NOTE, SaveNoteAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS, ScheduleAllFollowupTasksAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.PROCESS_SOURCE, ProcessSourceAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.SCHEDULE_INSTRUCTION_LINES, ScheduleInstructionsAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.SCHEDULE_IMAGES, ScheduleImagesAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.CHECK_DUPLICATES, CheckDuplicatesAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.WAIT_FOR_CATEGORIZATION, WaitForCategorizationAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.MARK_NOTE_WORKER_COMPLETED, MarkNoteWorkerCompletedAction),
  ]);
}

export * from "./save-note";
export * from "./parse-html";
export * from "./clean-html";
export * from "./schedule-source";
export * from "./schedule-images";
export * from "./schedule-ingredients";
export * from "./schedule-instructions";
export * from "./schedule-all-followup-tasks";
export * from "../schema";

import { ActionFactory } from "../../core/action-factory";
import { SaveNoteAction } from "./save-note";
import { ParseHtmlAction } from "./parse-html";
import { CleanHtmlAction } from "./clean-html";
import { ScheduleSourceAction } from "./schedule-source";
import { ScheduleImagesAction } from "./schedule-images";
import { ScheduleIngredientsAction } from "./schedule-ingredients";
import { ScheduleInstructionsAction } from "./schedule-instructions";
import { ScheduleAllFollowupTasksAction } from "./schedule-all-followup-tasks";
import {
  registerActions,
  createActionRegistration,
} from "../../shared/action-registry";

/**
 * Register all note actions in the given ActionFactory
 */
export function registerNoteActions(factory: ActionFactory) {
  registerActions(factory, [
    createActionRegistration("parse_html", ParseHtmlAction),
    createActionRegistration("clean_html", CleanHtmlAction),
    createActionRegistration("save_note", SaveNoteAction),
    createActionRegistration("schedule_images", ScheduleImagesAction),
    createActionRegistration("schedule_source", ScheduleSourceAction),
    createActionRegistration("schedule_ingredients", ScheduleIngredientsAction),
    createActionRegistration(
      "schedule_instructions",
      ScheduleInstructionsAction
    ),
    createActionRegistration(
      "schedule_all_followup_tasks",
      ScheduleAllFollowupTasksAction
    ),
  ]);
}

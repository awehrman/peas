export * from "./save-note";
export * from "./parse-html";
export * from "./schedule-source";
export * from "./schedule-images";
export * from "./schedule-ingredients";
export * from "./schedule-instructions";
export * from "./add-status-actions";
export * from "../schema";

import { ActionFactory } from "../../core/action-factory";
import { SaveNoteAction } from "./save-note";
import { ParseHtmlAction } from "./parse-html";
import { ScheduleSourceAction } from "./schedule-source";
import { ScheduleImagesAction } from "./schedule-images";
import { ScheduleIngredientsAction } from "./schedule-ingredients";
import { ScheduleInstructionsAction } from "./schedule-instructions";
import { AddStatusActionsAction } from "./add-status-actions";
import {
  BroadcastProcessingAction,
  BroadcastCompletedAction,
} from "../../shared/broadcast-status";

/**
 * Register all note actions in the given ActionFactory
 */
export function registerNoteActions(factory: ActionFactory) {
  factory.register("parse_html", () => new ParseHtmlAction());
  factory.register("save_note", () => new SaveNoteAction());
  factory.register("schedule_images", () => new ScheduleImagesAction());
  factory.register("schedule_source", () => new ScheduleSourceAction());
  factory.register(
    "schedule_ingredients",
    () => new ScheduleIngredientsAction()
  );
  factory.register(
    "schedule_instructions",
    () => new ScheduleInstructionsAction()
  );
  factory.register("add_status_actions", () => new AddStatusActionsAction());
  factory.register(
    "note_processing_status",
    () => new BroadcastProcessingAction()
  );
  factory.register(
    "note_completed_status",
    () => new BroadcastCompletedAction()
  );
}

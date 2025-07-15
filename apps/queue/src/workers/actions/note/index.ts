export * from "./save-note";
export * from "./parse-html";
export * from "./schedule-categorization";
export * from "./schedule-images";
export * from "./schedule-ingredients";
export * from "./schedule-instructions";
export * from "./add-status-actions";
export * from "./types";
export * from "./validation";

import { ActionFactory } from "../core/action-factory";
import { SaveNoteAction } from "./save-note";
import { ParseHtmlAction } from "./parse-html";
import { ScheduleCategorizationAction } from "./schedule-categorization";
import { ScheduleImagesAction } from "./schedule-images";
import { ScheduleIngredientsAction } from "./schedule-ingredients";
import { ScheduleInstructionsAction } from "./schedule-instructions";
import { AddStatusActionsAction } from "./add-status-actions";

/**
 * Register all note actions in the given ActionFactory
 */
export function registerNoteActions(factory: ActionFactory) {
  factory.register("save_note", () => new SaveNoteAction());
  factory.register("parse_html", () => new ParseHtmlAction());
  factory.register(
    "schedule_categorization",
    () => new ScheduleCategorizationAction()
  );
  factory.register("schedule_images", () => new ScheduleImagesAction());
  factory.register(
    "schedule_ingredients",
    () => new ScheduleIngredientsAction()
  );
  factory.register(
    "schedule_instructions",
    () => new ScheduleInstructionsAction()
  );
  factory.register("add_status_actions", () => new AddStatusActionsAction());
}

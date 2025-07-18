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
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { NoteWorkerDependencies, NotePipelineStage3 } from "../types";

/**
 * Custom action that broadcasts note completion with the note title
 */
class NoteCompletedStatusAction extends BaseAction<
  NotePipelineStage3,
  NoteWorkerDependencies
> {
  name = "note_completed_status";

  async execute(
    data: NotePipelineStage3,
    deps: NoteWorkerDependencies,
    _context: ActionContext
  ) {
    // Use note title if available, otherwise fall back to import ID
    const title = data.note?.title;
    const message = title
      ? `Imported ${title}`
      : `Import ${data.importId.slice(0, 8)}... completed`;

    await deps.addStatusEventAndBroadcast({
      importId: data.importId,
      noteId: data.note?.id,
      status: "COMPLETED",
      message,
      context: "import_complete", // Use import_complete context to update the import title
      indentLevel: 0, // Top level for completion
      metadata: {
        noteTitle: title,
      },
    });
    return data;
  }
}

/**
 * Register all note actions in the given ActionFactory
 */
export function registerNoteActions(factory: ActionFactory) {
  factory.register("parse_html", () => new ParseHtmlAction());
  factory.register("clean_html", () => new CleanHtmlAction());
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
  factory.register(
    "schedule_all_followup_tasks",
    () => new ScheduleAllFollowupTasksAction()
  );
  factory.register(
    "note_completed_status",
    () => new NoteCompletedStatusAction()
  );
}

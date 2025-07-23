import { CleanHtmlAction } from "./clean-html";
import { ParseHtmlAction } from "./parse-html";
import { SaveNoteAction } from "./save-note";
import type { NotePipelineData, NoteWorkerDependencies } from "./types";

import { ActionFactory } from "../../../workers/core/action-factory";
import {
  createActionRegistration,
  registerActions,
} from "../../../workers/shared/action-registry";

/**
 * Register all note actions in the given ActionFactory with type safety
 */
export function registerNoteActions(
  factory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData // <-- Output type matches input type
  >
): void {
  registerActions(factory, [
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >("parse_html", ParseHtmlAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >("clean_html", CleanHtmlAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >("save_note", SaveNoteAction),
  ]);
}

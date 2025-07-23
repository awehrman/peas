import { CleanHtmlAction } from "./clean-html";
import { ParseHtmlAction } from "./parse-html";

import { ActionName } from "../../../types";
// import { SaveNoteAction } from "./save-note"; // Temporarily disabled

import type { NotePipelineData } from "../../../types/notes";
import type { NoteWorkerDependencies } from "../../../types/notes";
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
    >(ActionName.PARSE_HTML, ParseHtmlAction),
    createActionRegistration<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >(ActionName.CLEAN_HTML, CleanHtmlAction),
    // createActionRegistration<
    //   NotePipelineData,
    //   NoteWorkerDependencies,
    //   NotePipelineData
    // >("save_note", SaveNoteAction), // Temporarily disabled
  ]);
}

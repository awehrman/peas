import { parseHTMLContent } from "../../parsers/html";
import type { IServiceContainer } from "../../services/container";
import { cleanHtmlFile } from "../../services/note/actions/clean-html/action";
import { parseHtmlFile } from "../../services/note/actions/parse-html/action";
import { saveNote } from "../../services/note/actions/save-note/action";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../types/notes";
import { buildBaseDependencies } from "../core/worker-dependencies/build-base-dependencies";

export function buildNoteWorkerDependencies(
  container: IServiceContainer
): NoteWorkerDependencies {
  const baseDeps = buildBaseDependencies(container);

  return {
    ...baseDeps,
    services: {
      parseHtml: async (data: NotePipelineData) => {
        return parseHtmlFile(data, baseDeps.logger, parseHTMLContent);
      },
      cleanHtml: async (data: NotePipelineData) =>
        cleanHtmlFile(data, baseDeps.logger),
      saveNote: async (data: NotePipelineData) =>
        saveNote(data, baseDeps.logger),
    },
  };
}

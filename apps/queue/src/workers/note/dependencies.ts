import { parseHTMLContent } from "../../parsers/html";
import { cleanHtmlFile } from "../../services/actions/note/clean-html";
import { parseHtmlFile } from "../../services/actions/note/parse-html";
import type { IServiceContainer } from "../../services/container";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../types/notes";
import { buildBaseDependencies } from "../core/worker-dependencies/build-base-dependencies";

// ============================================================================
// NOTE WORKER DEPENDENCIES
// ============================================================================

/**
 * Build note worker dependencies from service container
 */
export function buildNoteWorkerDependencies(
  container: IServiceContainer
): NoteWorkerDependencies {
  const baseDeps = buildBaseDependencies(container);

  return {
    ...baseDeps,
    services: {
      cleanHtml: async (data: NotePipelineData) =>
        cleanHtmlFile(data, baseDeps.logger),
      parseHtml: async (data: NotePipelineData) =>
        parseHtmlFile(data, baseDeps.logger, parseHTMLContent),
    },
  };
}

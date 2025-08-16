import { parseHtml } from "./service";

import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import { markWorkerCompleted } from "../track-completion/service";

export class ParseHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.PARSE_HTML;

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    _context: ActionContext
  ): Promise<NotePipelineData> {
    const result = await parseHtml(data, deps.logger);

          // Broadcast initial status messages for ingredients and instructions
      if (deps.statusBroadcaster && result && result.file && data) {
        const ingredientCount = result.file.ingredients?.length || 0;
        const instructionCount = result.file.instructions?.length || 0;

        // Broadcast initial ingredient status
        if (ingredientCount > 0) {
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId || "",
            noteId: data.noteId,
            status: "PROCESSING",
            message: `Processing 0/${ingredientCount} ingredients`,
            context: "ingredient_processing",
            currentCount: 0,
            totalCount: ingredientCount,
            indentLevel: 2,
            metadata: {
              totalIngredients: ingredientCount,
              htmlFileName: data.htmlFileName,
            },
          });
        }

        // Broadcast initial instruction status
        if (instructionCount > 0) {
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId || "",
            noteId: data.noteId,
            status: "PROCESSING",
            message: `Processing 0/${instructionCount} instructions`,
            context: "instruction_processing",
            currentCount: 0,
            totalCount: instructionCount,
            indentLevel: 2,
            metadata: {
              totalInstructions: instructionCount,
              htmlFileName: data.htmlFileName,
            },
          });
        }
      }

    // Mark note worker as completed
    if (data && data.noteId) {
      await markWorkerCompleted(
        data.noteId,
        "note",
        deps.logger,
        deps.statusBroadcaster
      );
    }

    return result;
  }
}

export { parseHtml as parseHtmlFile };

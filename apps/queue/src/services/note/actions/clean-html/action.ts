import { cleanHtmlFile } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { calculateRemovedSize } from "../../../../utils/html-cleaner";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class CleanHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.CLEAN_HTML;

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => deps.services.cleanHtml(data),
      contextName: "clean_html",
      startMessage: "Cleaning .html files...",
      completionMessage: "Cleaned .html files!",
      additionalBroadcasting: async (result) => {
        /* istanbul ignore next -- @preserve */
        if (deps.statusBroadcaster) {
          const originalLength = data?.content?.length ?? 0;
          const cleanedLength =
            (result as NotePipelineData)?.content?.length ?? 0;
          const sizeRemoved = calculateRemovedSize(
            originalLength,
            cleanedLength
          );
          const originalSize = `${(originalLength / 1024).toFixed(1)} KB`;

          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            noteId: data.noteId,
            status: "COMPLETED",
            message: "Cleaned .html files!",
            context: "clean_html",
            indentLevel: 1,
            metadata: {
              sizeRemoved,
              originalSize,
            },
          });
        }
      },
    });
  }
}

export { cleanHtmlFile };

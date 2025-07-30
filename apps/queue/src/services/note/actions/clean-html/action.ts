import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { calculateRemovedSize } from "../../../../utils/html-cleaner";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import { cleanHtmlFile } from "./service";

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
      startMessage: "HTML cleaning started",
      completionMessage: `HTML cleaning completed (${calculateRemovedSize(data.content.length, data.content.length)} removed)`,
    });
  }
}

export { cleanHtmlFile };

import { cleanHtmlFile } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
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
    });
  }
}

export { cleanHtmlFile };

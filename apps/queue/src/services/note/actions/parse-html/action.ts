import { parseHtml } from "./service";

import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class ParseHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.PARSE_HTML;

  async execute(
    data: NotePipelineData,
    dependencies: NoteWorkerDependencies,
    _context: ActionContext
  ): Promise<NotePipelineData> {
    return parseHtml(data, dependencies.logger);
  }
}

// Export the function for backward compatibility
export { parseHtml as parseHtmlFile };

import { ValidatedAction } from "../../core/validated-action";
import { ActionContext } from "../../core/types";
import { ParseHtmlData, ParseHtmlDeps, ParsedHtmlFile } from "../types";
import { ParseHtmlDataSchema } from "../schema";

export class ParseHtmlAction extends ValidatedAction<
  typeof ParseHtmlDataSchema,
  ParseHtmlDeps,
  ParseHtmlData & { file: ParsedHtmlFile }
> {
  name = "parse_html";
  constructor() {
    super(ParseHtmlDataSchema);
  }

  async run(
    data: ParseHtmlData,
    deps: ParseHtmlDeps,
    context: ActionContext
  ): Promise<ParseHtmlData & { file: ParsedHtmlFile }> {
    deps.logger.log(
      `[PARSE_HTML] Starting HTML parsing for job ${context.jobId}`
    );

    const file = await deps.parseHTML(data.content);

    deps.logger.log(
      `[PARSE_HTML] Successfully parsed HTML for job ${context.jobId}, title: "${file.title}"`
    );

    return { ...data, file };
  }
}

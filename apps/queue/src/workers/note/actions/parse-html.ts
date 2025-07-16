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
    _context: ActionContext
  ): Promise<ParseHtmlData & { file: ParsedHtmlFile }> {
    const file = await deps.parseHTML(data.content);
    return { ...data, file };
  }
}

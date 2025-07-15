import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import { ParseHtmlData, ParseHtmlDeps, ParsedHtmlFile } from "./types";
import { NoteValidation } from "./validation";

export class ParseHtmlAction extends BaseAction<ParseHtmlData, ParseHtmlDeps> {
  name = "parse_html";

  async execute(
    data: ParseHtmlData,
    deps: ParseHtmlDeps,
    _context: ActionContext
  ): Promise<ParseHtmlData & { file: ParsedHtmlFile }> {
    // Validate input
    const validationError = NoteValidation.validateParseHtmlData(data);
    if (validationError) {
      throw validationError;
    }

    const file = await deps.parseHTML(data.content);
    return { ...data, file };
  }
}

import { ValidatedAction } from "../../core/validated-action";
import { ActionContext } from "../../core/types";
import { NoteWorkerDependencies } from "../types";
import {
  ParseHtmlDataSchema,
  type ParseHtmlData,
  type ParsedHtmlFile,
} from "../schema";

export class ParseHtmlAction extends ValidatedAction<
  typeof ParseHtmlDataSchema,
  NoteWorkerDependencies,
  ParseHtmlData & { file: ParsedHtmlFile }
> {
  name = "parse_html";
  constructor() {
    super(ParseHtmlDataSchema);
  }

  async run(
    data: ParseHtmlData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<ParseHtmlData & { file: ParsedHtmlFile }> {
    deps.logger.log(
      `[PARSE_HTML] Starting HTML parsing for job ${context.jobId}`
    );

    // Broadcast start status if importId is provided
    if (data.importId) {
      try {
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PROCESSING",
          message: "HTML parsing started",
          context: "parse_html",
          indentLevel: 1, // Slightly indented for main operations
        });
      } catch (error) {
        deps.logger.log(
          `[PARSE_HTML] Failed to broadcast start status: ${error}`
        );
      }
    }

    const file = await deps.parseHTML(data.content);

    deps.logger.log(
      `[PARSE_HTML] Successfully parsed HTML for job ${context.jobId}, title: "${file.title}, ingredients: ${file.ingredients.length}, instructions: ${file.instructions.length}"`
    );

    if (data.importId) {
      try {
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "COMPLETED",
          message: `HTML parsing completed (${file.ingredients.length} ingredients and ${file.instructions.length} instructions)`,
          context: "parse_html",
          indentLevel: 1, // Slightly indented for main operations
          metadata: {
            noteTitle: file.title, // Include the note title in metadata
          },
        });

        // Also broadcast the note title for the import header
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "COMPLETED",
          message: `Note: ${file.title}`,
          context: "import_complete",
          indentLevel: 0, // Top level for the import header
          metadata: {
            noteTitle: file.title,
          },
        });
      } catch (error) {
        console.error(
          `[${context.operation.toUpperCase()}] Failed to broadcast completion status:`,
          error
        );
      }
    }

    return { ...data, file };
  }
}

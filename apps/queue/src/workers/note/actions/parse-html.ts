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
          message: "Parsing HTML",
          context: "parse_html_start",
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
          message: "Finished parsing HTML file.",
          context: "parse_html_complete",
          indentLevel: 1, // Slightly indented for main operations
          metadata: {
            noteTitle: file.title, // Include the note title in metadata
          },
        });

        // Broadcast ingredient count status
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PENDING",
          message: `0/${file.ingredients.length} ingredients`,
          context: "parse_html_ingredients",
          indentLevel: 2, // Additional indentation for ingredients
          metadata: {
            totalIngredients: file.ingredients.length,
            processedIngredients: 0,
          },
        });

        // Broadcast instruction count status
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PENDING",
          message: `0/${file.instructions.length} instructions`,
          context: "parse_html_instructions",
          indentLevel: 2, // Additional indentation for instructions
          metadata: {
            totalInstructions: file.instructions.length,
            processedInstructions: 0,
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

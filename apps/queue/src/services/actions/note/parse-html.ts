import type { ParsedHTMLFile } from "@peas/database";

import type { HTMLParsingOptions } from "../../../parsers/types";
import { ParseHtmlDataSchema } from "../../../schemas/note";
import { ActionName } from "../../../types";
import { ParsedIngredientLine, ParsedInstructionLine } from "../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import { BaseAction } from "../../../workers/core/base-action";
import { ActionContext } from "../../../workers/core/types";
import type { StructuredLogger } from "../../../types";

/**
 * Parse HTML file and convert to structured format
 * This is the business logic that can be imported and used elsewhere
 */
export async function parseHtmlFile(
  data: NotePipelineData,
  logger: StructuredLogger,
  parseHTMLContent: (
    content: string,
    options?: HTMLParsingOptions
  ) => ParsedHTMLFile
): Promise<NotePipelineData> {
  logger.log(`[PARSE_HTML] Starting HTML parsing`);

  // Call the parseHTMLContent function with the content string
  const result = parseHTMLContent(data.content);

  // Convert the parsed data to the expected ParsedHTMLFile format
  const file: ParsedHTMLFile = {
    title: result.title || "Untitled",
    contents: data.content, // Use the original content
    ingredients:
      result.ingredients?.map(
        (ingredient: ParsedIngredientLine, index: number) => ({
          reference: ingredient.reference,
          blockIndex: ingredient.blockIndex || 0,
          lineIndex: ingredient.lineIndex || index,
        })
      ) || [],
    instructions:
      result.instructions?.map(
        (instruction: ParsedInstructionLine, index: number) => ({
          reference: instruction.reference,
          lineIndex: instruction.lineIndex || index,
        })
      ) || [],
    image: result.image || "",
    historicalCreatedAt: result.historicalCreatedAt,
    source: result.source,
  };

  logger.log(
    `[PARSE_HTML] Successfully parsed HTML, title: "${file.title}", ingredients: ${file.ingredients.length}, instructions: ${file.instructions.length}"`
  );

  return { ...data, file };
}

export class ParseHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.PARSE_HTML;
  private schema = ParseHtmlDataSchema;

  validateInput(data: NotePipelineData): Error | null {
    try {
      this.schema.parse(data);
      return null;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    // Broadcast start status if importId is provided
    if (data.importId && deps.statusBroadcaster) {
      try {
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
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

    // Call the parseHtmlFile service from dependencies
    const result = await deps.services.parseHtml(data);

    // Broadcast completion status if we have an importId
    if (data.importId && deps.statusBroadcaster && result.file) {
      try {
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "COMPLETED",
          message: "Finished parsing HTML file.",
          context: "parse_html_complete",
          indentLevel: 1, // Slightly indented for main operations
          metadata: {
            noteTitle: result.file.title, // Include the note title in metadata
          },
        });

        // Broadcast ingredient count status
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PENDING",
          message: `0/${result.file.ingredients?.length || 0} ingredients`,
          context: "parse_html_ingredients",
          indentLevel: 2, // Additional indentation for ingredients
          metadata: {
            totalIngredients: result.file.ingredients?.length || 0,
            processedIngredients: 0,
          },
        });

        // Broadcast instruction count status
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PENDING",
          message: `0/${result.file.instructions?.length || 0} instructions`,
          context: "parse_html_instructions",
          indentLevel: 2, // Additional indentation for instructions
          metadata: {
            totalInstructions: result.file.instructions?.length || 0,
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

    return result;
  }
}

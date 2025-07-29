import type { ParsedHTMLFile } from "@peas/database";

import type { HTMLParsingOptions } from "../../parsers/types";
import { ParseHtmlDataSchema } from "../../schemas/note";
import type { StructuredLogger } from "../../types";
import { ActionName } from "../../types";
import { ParsedIngredientLine, ParsedInstructionLine } from "../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../types/notes";
import { BaseAction } from "../../workers/core/base-action";
import { ActionContext } from "../../workers/core/types";

/**
 * Parse HTML file and convert to structured format.
 *
 * This function takes HTML content and parses it into a structured format containing
 * ingredients, instructions, title, and metadata. It uses the provided parsing function
 * to extract structured data from the HTML content and transforms it into the expected
 * ParsedHTMLFile format.
 *
 * @param data - The pipeline data containing the HTML content to parse
 * @param logger - Logger instance for recording parsing progress and statistics
 * @param parseHTMLContent - Function that performs the actual HTML parsing logic
 * @returns Promise resolving to the updated pipeline data with parsed file information
 *
 * @example
 * ```typescript
 * const result = await parseHtmlFile(pipelineData, logger, parseHTMLContent);
 * console.log(`Parsed ${result.file?.ingredients.length} ingredients`);
 * ```
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

/**
 * Action class for parsing HTML content in the worker pipeline.
 *
 * This action validates input data using a Zod schema and delegates the actual
 * HTML parsing to the parseHtml service. It extends BaseAction to provide
 * standardized error handling, logging, and status broadcasting.
 *
 * The action includes additional status broadcasting for import tracking,
 * providing detailed progress information about parsed ingredients and instructions.
 *
 * @example
 * ```typescript
 * const action = new ParseHtmlAction();
 * const result = await action.execute(pipelineData, dependencies, context);
 * ```
 */
export class ParseHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.PARSE_HTML;

  /** Zod schema for validating input data before processing */
  private schema = ParseHtmlDataSchema;

  /**
   * Validates the input data using the ParseHtmlDataSchema.
   *
   * This method ensures that the pipeline data contains all required fields
   * and meets the schema requirements before attempting to parse the HTML.
   *
   * @param data - The pipeline data to validate
   * @returns null if validation passes, Error object if validation fails
   *
   * @example
   * ```typescript
   * const error = action.validateInput(pipelineData);
   * if (error) {
   *   console.error('Validation failed:', error.message);
   * }
   * ```
   */
  validateInput(data: NotePipelineData): Error | null {
    try {
      this.schema.parse(data);
      return null;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Executes the HTML parsing action.
   *
   * This method orchestrates the HTML parsing process by:
   * 1. Validating the input data
   * 2. Calling the parseHtml service with proper error handling
   * 3. Broadcasting status updates with detailed progress information
   * 4. Logging operation progress
   *
   * When an importId is present, it broadcasts additional status events for:
   * - Parse completion with note title
   * - Ingredient count and progress tracking
   * - Instruction count and progress tracking
   *
   * @param data - The pipeline data containing the HTML content to parse
   * @param deps - Worker dependencies including services, logger, and status broadcaster
   * @param context - Action context for tracking execution state
   * @returns Promise resolving to the updated pipeline data with parsed file information
   * @throws {Error} When validation fails or the parsing operation encounters an error
   *
   * @example
   * ```typescript
   * const result = await action.execute(pipelineData, dependencies, context);
   * console.log(`Parsed file: ${result.file?.title}`);
   * ```
   */
  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => deps.services.parseHtml(data),
      contextName: "parse_html_start",
      startMessage: "Parsing HTML",
      completionMessage: "Finished parsing HTML file.",
      additionalBroadcasting: async (result) => {
        if (data.importId && deps.statusBroadcaster && result.file) {
          // Send completion message with correct context and metadata
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            status: "COMPLETED",
            message: "Finished parsing HTML file.",
            context: "parse_html_complete",
            indentLevel: 1,
            metadata: {
              noteTitle: result.file.title,
            },
          });

          // Broadcast ingredient count status
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            status: "PENDING",
            message: `0/${result.file.ingredients?.length || 0} ingredients`,
            context: "parse_html_ingredients",
            indentLevel: 2,
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
            indentLevel: 2,
            metadata: {
              totalInstructions: result.file.instructions?.length || 0,
              processedInstructions: 0,
            },
          });
        }
      },
    });
  }
}

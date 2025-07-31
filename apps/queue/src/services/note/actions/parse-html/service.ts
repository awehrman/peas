import type { ParsedHTMLFile } from "@peas/database";

import type { HTMLParsingOptions } from "../../../../parsers/types";
import type { StructuredLogger } from "../../../../types";
import { ParsedIngredientLine, ParsedInstructionLine } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";

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
    evernoteMetadata: result.evernoteMetadata,
  };

  logger.log(
    `[PARSE_HTML] Successfully parsed HTML, title: "${file.title}", ingredients: ${file.ingredients.length}, instructions: ${file.instructions.length}"`
  );

  return { ...data, file };
}

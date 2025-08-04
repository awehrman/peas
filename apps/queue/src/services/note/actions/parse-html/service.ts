import type { ParsedHTMLFile } from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";

export async function parseHtml(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  try {
    logger.log(
      `[PARSE_HTML] Starting HTML parsing for import: ${data.importId}`
    );

    // For now, we'll create a basic parsed file structure
    // In a real implementation, this would use the HTML parser
    const result = {
      title: "Sample Recipe",
      contents: data.content,
      ingredients: [],
      instructions: [],
      evernoteMetadata: {
        source: data.source?.url,
        originalCreatedAt: undefined,
        tags: undefined,
      },
    };

    const parsedFile: ParsedHTMLFile = {
      title: result.title || "",
      contents: result.contents || "",
      ingredients: result.ingredients || [],
      instructions: result.instructions || [],
      evernoteMetadata: result.evernoteMetadata,
    };

    logger.log(
      `[PARSE_HTML] HTML parsing completed for import: ${data.importId}`
    );

    return { ...data, file: parsedFile };
  } catch (error) {
    logger.log(`[PARSE_HTML] HTML parsing failed: ${error}`);
    throw error;
  }
}

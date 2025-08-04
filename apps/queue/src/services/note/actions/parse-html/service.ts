import { parseHTMLContent } from "../../../../parsers/html";
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
    logger.log(
      `[PARSE_HTML] Content length: ${data.content?.length || 0} characters`
    );
    logger.log(
      `[PARSE_HTML] Content preview: ${data.content?.substring(0, 200)}...`
    );

    // Use the existing HTML parser
    const parsedFile = parseHTMLContent(data.content, {
      measurePerformance: false,
      logger: (message: string) => {
        logger.log(`[PARSE_HTML] ${message}`);
      },
    });

    logger.log(`[PARSE_HTML] Parsing completed successfully`);
    logger.log(`[PARSE_HTML] Extracted title: "${parsedFile.title}"`);
    logger.log(
      `[PARSE_HTML] Found ${parsedFile.ingredients.length} ingredients`
    );
    logger.log(
      `[PARSE_HTML] Found ${parsedFile.instructions.length} instructions`
    );

    if (parsedFile.ingredients.length > 0) {
      const firstIngredients = parsedFile.ingredients
        .slice(0, 3)
        .map((ing) => ing.reference);
      logger.log(
        `[PARSE_HTML] First few ingredients: ${firstIngredients.join(", ")}`
      );
    }

    if (parsedFile.instructions.length > 0) {
      const firstInstructions = parsedFile.instructions
        .slice(0, 3)
        .map((inst) => inst.reference);
      logger.log(
        `[PARSE_HTML] First few instructions: ${firstInstructions.join(", ")}`
      );
    }

    logger.log(
      `[PARSE_HTML] HTML parsing completed for import: ${data.importId}`
    );

    return { ...data, file: parsedFile };
  } catch (error) {
    logger.log(`[PARSE_HTML] HTML parsing failed: ${error}`);
    throw error;
  }
}

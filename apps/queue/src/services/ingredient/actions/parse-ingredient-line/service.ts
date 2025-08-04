import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";

export async function parseIngredientLine(
  data: IngredientJobData,
  logger: StructuredLogger
): Promise<IngredientJobData> {
  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for ingredient parsing");
  }

  // Validate that we have an ingredient reference
  if (!data.ingredientReference) {
    throw new Error("No ingredient reference available for parsing");
  }

  try {
    logger.log(
      `[PARSE_INGREDIENT_LINE] Starting to parse ingredient: "${data.ingredientReference}" for note: ${data.noteId}`
    );

    // TODO: Implement actual ingredient parsing logic
    // This is a stub implementation for now
    logger.log(
      `[PARSE_INGREDIENT_LINE] Stub: Would parse ingredient "${data.ingredientReference}" for note: ${data.noteId}`
    );

    // For now, just return the data unchanged
    // In the real implementation, this would parse the ingredient and add parsed data to the pipeline
    return data;
  } catch (error) {
    logger.log(
      `[PARSE_INGREDIENT_LINE] Failed to parse ingredient: ${error}`
    );
    throw error;
  }
} 
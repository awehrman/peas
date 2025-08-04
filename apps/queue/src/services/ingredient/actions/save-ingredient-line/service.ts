import { getIngredientCompletionStatus } from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";

export async function saveIngredientLine(
  data: IngredientJobData,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<IngredientJobData> {
  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for ingredient saving");
  }

  // Validate that we have an ingredient reference
  if (!data.ingredientReference) {
    throw new Error("No ingredient reference available for saving");
  }

  try {
    logger.log(
      `[SAVE_INGREDIENT_LINE] Starting to save ingredient: "${data.ingredientReference}" for note: ${data.noteId}`
    );

    // TODO: Implement actual ingredient saving logic
    // This is a stub implementation for now
    logger.log(
      `[SAVE_INGREDIENT_LINE] Stub: Would save ingredient "${data.ingredientReference}" for note: ${data.noteId}`
    );

    // For now, just return the data unchanged
    // In the real implementation, this would save the ingredient to the database
    // Broadcast completion message if statusBroadcaster is available
    if (statusBroadcaster) {
      const completionStatus = await getIngredientCompletionStatus(data.noteId);

      await statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PENDING",
        message: "Ingredient completed",
        context: "ingredient_completed",
        indentLevel: 2,
        metadata: {
          totalIngredients: completionStatus.totalIngredients,
          lineIndex: data.lineIndex,
        },
      });
    }

    return data;
  } catch (error) {
    logger.log(`[SAVE_INGREDIENT_LINE] Failed to save ingredient: ${error}`);
    throw error;
  }
}

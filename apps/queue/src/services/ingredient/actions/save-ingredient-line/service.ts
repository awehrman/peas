import {
  createIngredientReference,
  findOrCreateIngredient,
  getIngredientCompletionStatus,
  replaceParsedSegments,
  upsertParsedIngredientLine,
} from "@peas/database";

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
  try {
    // Validate that we have required data
    if (!data.noteId) {
      throw new Error("No note ID available for ingredient saving");
    }

    if (!data.ingredientReference) {
      throw new Error("No ingredient reference available for saving");
    }

    logger.log(
      `[SAVE_INGREDIENT_LINE] Starting to save ingredient: noteId=${data.noteId}, lineIndex=${data.lineIndex}, jobId=${data.jobId}`
    );

    // Update the ingredient line in the database
    const result = await upsertParsedIngredientLine(
      data.noteId,
      data.lineIndex,
      data.ingredientReference,
      data.parseStatus,
      undefined, // rule
      0, // blockIndex
      data.isActive
    );

    // Handle parsed segments if they exist
    const parsedSegments = data.metadata?.parsedSegments as
      | Array<{
          index: number;
          rule: string;
          type: string;
          value: string;
          processingTime?: number;
        }>
      | undefined;

    if (parsedSegments && parsedSegments.length > 0) {
      // Replace parsed segments
      await replaceParsedSegments(result.id, parsedSegments);

      // Process ingredient segments
      for (const segment of parsedSegments) {
        if (segment.type === "ingredient") {
          const ingredient = await findOrCreateIngredient(segment.value);
          await createIngredientReference(
            ingredient.id,
            result.id,
            segment.index,
            data.ingredientReference,
            data.noteId,
            ingredient.isNew ? "new_ingredient" : "existing_ingredient"
          );
        }
      }
    }

    // Broadcast completion message if statusBroadcaster is available
    if (statusBroadcaster) {
      logger.log(
        `[SAVE_INGREDIENT_LINE] StatusBroadcaster is available, broadcasting completion`
      );

      try {
        // Get completion status for broadcasting
        const completionStatus = await getIngredientCompletionStatus(
          data.noteId
        );

        await statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: data.noteId,
          status: "AWAITING_PARSING",
          message: `Processing ${completionStatus.completedIngredients}/${completionStatus.totalIngredients} ingredients`,
          context: "ingredient_processing",
          currentCount: completionStatus.completedIngredients,
          totalCount: completionStatus.totalIngredients,
          indentLevel: 1,
          metadata: {
            totalIngredients: completionStatus.totalIngredients,
            completedIngredients: completionStatus.completedIngredients,
            savedIngredientId: result.id,
            lineIndex: data.lineIndex,
          },
        });
        logger.log(
          `[SAVE_INGREDIENT_LINE] Successfully broadcasted ingredient completion for line ${data.lineIndex} with ID ${result.id}`
        );
      } catch (broadcastError) {
        logger.log(
          `[SAVE_INGREDIENT_LINE] Failed to broadcast ingredient completion: ${broadcastError}`
        );
      }
    } else {
      logger.log(`[SAVE_INGREDIENT_LINE] StatusBroadcaster is not available`);
    }

    return data;
  } catch (error) {
    logger.log(`[SAVE_INGREDIENT_LINE] Failed to save ingredient: ${error}`);
    throw error;
  }
}

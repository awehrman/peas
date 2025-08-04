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

    // Extract typed metadata
    const metadata = data.metadata as
      | {
          rule?: string;
          blockIndex?: number;
          parsedSegments?: Array<{
            index: number;
            rule: string;
            type: string;
            value: string;
            processingTime?: number;
          }>;
        }
      | undefined;

    // 1. Upsert the ParsedIngredientLine record
    const { id: lineId } = await upsertParsedIngredientLine(
      data.noteId,
      data.lineIndex,
      data.ingredientReference,
      data.parseStatus,
      metadata?.rule,
      metadata?.blockIndex ?? 0,
      data.isActive
    );

    // 2. Replace parsed segments if any exist
    if (metadata?.parsedSegments) {
      await replaceParsedSegments(lineId, metadata.parsedSegments);

      // 3. Process ingredient segments and create ingredient references
      let ingredientCount = 0;
      for (const segment of metadata.parsedSegments) {
        if (segment.type === "ingredient") {
          ingredientCount++;

          // Find or create ingredient with pluralization support
          const { id: ingredientId, isNew } = await findOrCreateIngredient(
            segment.value
          );

          // Create ingredient reference linking ingredient to this parsed line
          await createIngredientReference(
            ingredientId,
            lineId,
            segment.index,
            data.ingredientReference,
            data.noteId,
            isNew ? "new_ingredient" : "existing_ingredient"
          );

          logger.log(
            `[SAVE_INGREDIENT_LINE] Processed ingredient "${segment.value}" (${isNew ? "new" : "existing"}) for line: ${data.ingredientReference}`
          );
        }
      }

      if (ingredientCount > 0) {
        logger.log(
          `[SAVE_INGREDIENT_LINE] Created ${ingredientCount} ingredient reference(s) for line: ${data.ingredientReference}`
        );
      }
    }
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

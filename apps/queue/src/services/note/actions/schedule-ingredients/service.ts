import type { StructuredLogger } from "../../../../types";
import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { BaseWorkerDependencies } from "../../../../workers/types";

export async function processIngredients(
  data: NotePipelineData,
  logger: StructuredLogger,
  queues: BaseWorkerDependencies["queues"]
): Promise<NotePipelineData> {
  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for ingredient processing");
  }

  try {
    logger.log(
      `[SCHEDULE_INGREDIENTS] Starting ingredient processing for note: ${data.noteId}`
    );

    // Check if we should clear cache
    const shouldClearCache = data.metadata?.clearIngredientCache === true;
    if (shouldClearCache) {
      logger.log(
        `[SCHEDULE_INGREDIENTS] Clearing ingredient cache as requested`
      );
      const { CachedIngredientParser } = await import(
        "../../../ingredient/cached-ingredient-parser"
      );
      await CachedIngredientParser.invalidateIngredientCache();
    }

    // Validate that we have file data with ingredients
    if (!data.file?.ingredients || data.file.ingredients.length === 0) {
      logger.log(
        `[SCHEDULE_INGREDIENTS] No ingredients found for note: ${data.noteId}`
      );
      return data;
    }

    logger.log(
      `[SCHEDULE_INGREDIENTS] Found ${data.file.ingredients.length} ingredients to process`
    );

    // Use the existing ingredient queue from the dependencies
    const ingredientQueue = queues?.ingredientQueue;

    if (!ingredientQueue) {
      throw new Error("Ingredient queue not available in dependencies");
    }

    for (const ingredient of data.file.ingredients) {
      logger.log(
        `[SCHEDULE_INGREDIENTS] Processing ingredient: ${ingredient.reference}`
      );

      const ingredientJobData = {
        noteId: data.noteId,
        importId: data.importId,
        ingredientReference: ingredient.reference,
        lineIndex: ingredient.lineIndex,
        jobId: `${data.noteId}-ingredient-${ingredient.lineIndex}`,
        metadata: {
          clearCache: shouldClearCache, // Pass cache clearing flag to individual jobs
        },
      };

      logger.log(
        `[SCHEDULE_INGREDIENTS] Adding job to queue for ingredient ${ingredient.lineIndex}: ${ingredient.reference}`
      );

      // Schedule a single job - the worker pipeline will handle parse + save
      await ingredientQueue.add(
        ActionName.PARSE_INGREDIENT_LINE,
        ingredientJobData
      );
    }

    logger.log(
      `[SCHEDULE_INGREDIENTS] Successfully scheduled ${data.file.ingredients.length} ingredient jobs`
    );

    return data;
  } catch (error) {
    logger.log(
      `[SCHEDULE_INGREDIENTS] Failed to schedule ingredients: ${error}`
    );
    throw error;
  }
}

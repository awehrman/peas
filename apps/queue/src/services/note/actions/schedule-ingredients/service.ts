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
    // Validate that we have file data with ingredients
    if (!data.file?.ingredients || data.file.ingredients.length === 0) {
      logger.log(
        `[SCHEDULE_INGREDIENTS] No ingredients found for note: ${data.noteId}`
      );
      return data;
    }

    // Use the existing ingredient queue from the dependencies
    const ingredientQueue = queues?.ingredientQueue;

    if (!ingredientQueue) {
      throw new Error("Ingredient queue not available in dependencies");
    }

    for (const ingredient of data.file.ingredients) {
      const ingredientJobData = {
        noteId: data.noteId,
        importId: data.importId,
        ingredientReference: ingredient.reference,
        lineIndex: ingredient.lineIndex,
        jobId: `${data.noteId}-ingredient-${ingredient.lineIndex}`,
      };

      // Schedule a single job - the worker pipeline will handle parse + save
      await ingredientQueue.add(
        ActionName.PARSE_INGREDIENT_LINE,
        ingredientJobData
      );
    }

    return data;
  } catch (error) {
    logger.log(
      `[SCHEDULE_INGREDIENTS] Failed to schedule ingredients: ${error}`
    );
    throw error;
  }
} 
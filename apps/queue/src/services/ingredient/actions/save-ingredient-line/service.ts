import { saveImportedLine } from "@peas/database";

import { ActionName } from "../../../../types";
import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import {
  getIngredientCompletionStatus,
  markIngredientLineCompleted,
} from "../../../note/actions/track-completion/service";
import { V2_PARSER_ID } from "../../ingredient-processor";
import { getResolverContext } from "../../lexicon-cache";
import { readV2Result } from "../parse-ingredient-line/service";

/**
 * Saves a parsed line with v2 (Phase 5d): the line row, its mentions, and its discoveries in one transaction. Nothing is written to the legacy segment, reference, ingredient, parsing-rule, or pattern tables.
 */
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
    if (!data.noteId) {
      throw new Error("No note ID available for ingredient saving");
    }
    if (!data.ingredientReference) {
      throw new Error("No ingredient reference available for saving");
    }

    const v2Result = readV2Result(data.metadata);
    if (!v2Result) {
      throw new Error(
        `No valid v2 parse result for "${data.ingredientReference}"`
      );
    }
    const parserVersion =
      typeof data.metadata?.parserVersion === "string"
        ? data.metadata.parserVersion
        : V2_PARSER_ID;

    const result = await saveImportedLine(
      {
        noteId: data.noteId,
        blockIndex: data.blockIndex ?? 0,
        lineIndex: data.lineIndex,
        reference: data.ingredientReference,
        parseStatus: data.parseStatus,
        isActive: data.isActive,
        parserVersion,
        result: v2Result,
      },
      await getResolverContext(logger)
    );
    logger.log(
      `[V2_SAVE] line=${result.lineId} mentions=${result.mentionsWritten} changed=${result.mentionsChanged} protected=${result.protectedMentions} discoveries=${result.discoveriesTouched}`
    );

    // Mark this ingredient line as completed in in-memory tracking
    markIngredientLineCompleted(
      data.noteId,
      data.blockIndex ?? 0,
      data.lineIndex,
      logger
    );

    // Broadcast completion message if statusBroadcaster is available
    if (statusBroadcaster) {
      logger.log(
        `[SAVE_INGREDIENT_LINE] StatusBroadcaster is available, broadcasting completion`
      );

      try {
        // Get completion status for broadcasting (now from in-memory)
        const completionStatus = getIngredientCompletionStatus(data.noteId);

        logger.log(
          `[SAVE_INGREDIENT_LINE] Completion status for note ${data.noteId}: ${completionStatus.completedIngredients}/${completionStatus.totalIngredients} (isComplete: ${completionStatus.isComplete})`
        );

        // Always broadcast progress updates
        const shouldBroadcast = true;

        /* istanbul ignore next -- @preserve */
        if (shouldBroadcast) {
          /* istanbul ignore next -- @preserve */
          await statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            noteId: data.noteId,
            status: completionStatus.isComplete ? "COMPLETED" : "PROCESSING",
            message: completionStatus.isComplete
              ? `All ${completionStatus.totalIngredients} ingredients processed`
              : `Processing ${completionStatus.completedIngredients}/${completionStatus.totalIngredients} ingredients`,
            context: "ingredient_processing",
            currentCount: completionStatus.completedIngredients,
            totalCount: completionStatus.totalIngredients,
            indentLevel: 1,
            metadata: {
              totalIngredients: completionStatus.totalIngredients,
              completedIngredients: completionStatus.completedIngredients,
              savedIngredientId: result.lineId,
              lineIndex: data.lineIndex,
            },
          });
          logger.log(
            `[SAVE_INGREDIENT_LINE] Successfully broadcasted ingredient completion for line ${data.lineIndex} with ID ${result.lineId}`
          );
        }

        // Check if all ingredients are completed and trigger completion check
        logger.log(
          `[SAVE_INGREDIENT_LINE] Checking if completion check should be triggered: isComplete=${completionStatus.isComplete}, completed=${completionStatus.completedIngredients}, total=${completionStatus.totalIngredients}`
        );
        /* istanbul ignore next -- @preserve */
        if (completionStatus.isComplete) {
          /* istanbul ignore next -- @preserve */
          logger.log(
            `[SAVE_INGREDIENT_LINE] All ingredients completed for note ${data.noteId}, triggering completion check`
          );

          /* istanbul ignore next -- @preserve */
          try {
            // Import queue dynamically to avoid circular dependencies
            /* istanbul ignore next -- @preserve */
            const { createQueue } = await import(
              "../../../../queues/create-queue"
            );
            const ingredientQueue = createQueue("ingredient");

            await ingredientQueue.add(
              ActionName.CHECK_INGREDIENT_COMPLETION,
              {
                noteId: data.noteId,
                importId: data.importId,
                jobId: `${data.noteId}-ingredient-completion-check`,
                metadata: {},
              },
              {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                  type: "exponential",
                  delay: 1000,
                },
              }
            );

            logger.log(
              `[SAVE_INGREDIENT_LINE] Successfully queued completion check for note ${data.noteId}`
            );
          } catch (queueError) {
            /* istanbul ignore next -- @preserve */
            logger.log(
              `[SAVE_INGREDIENT_LINE] Failed to queue completion check: ${queueError}`
            );
            // Don't fail the main save operation if completion check fails
          }
        }
      } catch (broadcastError) {
        /* istanbul ignore next -- @preserve */
        logger.log(
          `[SAVE_INGREDIENT_LINE] Failed to broadcast ingredient completion: ${broadcastError}`
        );
      }
    } else {
      /* istanbul ignore next -- @preserve */
      logger.log(`[SAVE_INGREDIENT_LINE] StatusBroadcaster is not available`);
    }

    return data;
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    logger.log(`[SAVE_INGREDIENT_LINE] Failed to save ingredient: ${error}`);
    throw error;
  }
}

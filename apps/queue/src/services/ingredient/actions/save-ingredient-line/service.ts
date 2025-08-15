import {
  createIngredientReference,
  findOrCreateIngredient,
  saveParsedIngredientLine,
} from "@peas/database";

import { ActionName } from "../../../../types";
import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import {
  getIngredientCompletionStatus,
  markIngredientLineCompleted,
} from "../../../note/actions/track-completion/service";

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

    // Update the ingredient line in the database with segments
    const result = await saveParsedIngredientLine(
      data.noteId,
      data.lineIndex,
      data.ingredientReference,
      data.parseStatus,
      undefined, // rule
      0, // blockIndex
      data.isActive,
      parsedSegments || []
    );

    if (parsedSegments && parsedSegments.length > 0) {
      // Create parsing rules and get rule IDs for segments
      const { findOrCreateParsingRule } = await import("@peas/database");
      const segmentsWithRuleIds: Array<{
        index: number;
        rule: string;
        type: string;
        value: string;
        processingTime?: number;
        ruleId: string;
      }> = [];
      const patternRules: Array<{
        ruleId: string;
        ruleNumber: number;
      }> = [];

      // Create parsing rules and build pattern rules
      for (let i = 0; i < parsedSegments.length; i++) {
        const segment = parsedSegments[i];
        if (!segment) continue; // Skip undefined segments

        const rule = await findOrCreateParsingRule(segment.rule);

        segmentsWithRuleIds.push({
          index: segment.index,
          rule: segment.rule,
          type: segment.type,
          value: segment.value,
          processingTime: segment.processingTime,
          ruleId: rule.id,
        });

        patternRules.push({
          ruleId: rule.id,
          ruleNumber: i + 1,
        });
      }

      // Process ingredient segments
      for (const segment of segmentsWithRuleIds) {
        if (segment.type === "ingredient") {
          const ingredient = await findOrCreateIngredient(segment.value);
          await createIngredientReference(
            ingredient.id,
            result.id,
            segment.index,
            data.ingredientReference,
            data.noteId
          );
        }
      }

      // Queue pattern tracking for later processing
      /* istanbul ignore else -- @preserve */
      if (patternRules.length > 0) {
        try {
          // Import queue dynamically to avoid circular dependencies
          const { createQueue } = await import(
            "../../../../queues/create-queue"
          );
          const patternQueue = createQueue("patternTracking");

          await patternQueue.add(
            "track-pattern",
            {
              jobId: `pattern-${data.jobId}-${Date.now()}`,
              patternRules,
              exampleLine: data.ingredientReference,
              noteId: data.noteId,
              importId: data.importId,
              metadata: {
                originalJobId: data.jobId,
                lineIndex: data.lineIndex,
                ingredientLineId: result.id,
              },
            },
            {
              removeOnComplete: 100,
              removeOnFail: 50,
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 2000,
              },
            }
          );

          logger.log(
            `[SAVE_INGREDIENT_LINE] Queued pattern tracking for job ${data.jobId}`
          );
        } catch (queueError) {
          /* istanbul ignore next -- @preserve */
          logger.log(
            `[SAVE_INGREDIENT_LINE] Failed to queue pattern tracking: ${queueError}`
          );
          // Don't fail the main save operation if pattern tracking fails
        }
      }
    }

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

        await statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: data.noteId,
          status: "PROCESSING",
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

        // Check if all ingredients are completed and trigger completion check
        logger.log(
          `[SAVE_INGREDIENT_LINE] Checking if completion check should be triggered: isComplete=${completionStatus.isComplete}, completed=${completionStatus.completedIngredients}, total=${completionStatus.totalIngredients}`
        );

        if (completionStatus.isComplete) {
          /* istanbul ignore next -- @preserve */
          logger.log(
            `[SAVE_INGREDIENT_LINE] All ingredients completed for note ${data.noteId}, triggering completion check`
          );

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

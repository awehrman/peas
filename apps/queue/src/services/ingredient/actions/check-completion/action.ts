import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../../../workers/ingredient/dependencies";
import {
  getIngredientCompletionStatus,
  markNoteAsFailed,
  markWorkerCompleted,
} from "../../../note/actions/track-completion/service";

export class CheckIngredientCompletionAction extends BaseAction<
  IngredientJobData,
  IngredientWorkerDependencies,
  IngredientJobData
> {
  public readonly name = ActionName.CHECK_INGREDIENT_COMPLETION;

  public async execute(
    data: IngredientJobData,
    deps: IngredientWorkerDependencies,
    _context: ActionContext
  ): Promise<IngredientJobData> {
    if (!data.noteId) {
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] No note ID available for completion check`
      );
      return data;
    }

    // Retry logic for completion check
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    let success = false;

    while (retryCount < maxRetries && !success) {
      try {
        // Check completion status from in-memory tracking
        const completionStatus = getIngredientCompletionStatus(data.noteId);

        deps.logger.log(
          `[CHECK_INGREDIENT_COMPLETION] Attempt ${retryCount + 1}/${maxRetries} - Completion status for note ${data.noteId}: ${completionStatus.completedIngredients}/${completionStatus.totalIngredients} (isComplete: ${completionStatus.isComplete})`
        );

        // Only mark worker as completed if all ingredients are actually completed
        deps.logger.log(
          `[CHECK_INGREDIENT_COMPLETION] Evaluating completion: isComplete=${completionStatus.isComplete}, completed=${completionStatus.completedIngredients}, total=${completionStatus.totalIngredients}`
        );

        if (completionStatus.isComplete) {
          deps.logger.log(
            `[CHECK_INGREDIENT_COMPLETION] Marking ingredient worker as completed for note ${data.noteId}`
          );

          await markWorkerCompleted(
            data.noteId,
            "ingredient",
            deps.logger,
            deps.statusBroadcaster
          );
          deps.logger.log(
            `[CHECK_INGREDIENT_COMPLETION] All ingredients completed for note ${data.noteId}, marked ingredient worker as completed`
          );

          // Note: Categorization is now handled by the note worker
          // The note worker will wait for categorization to complete before finishing
          deps.logger.log(
            `[CHECK_INGREDIENT_COMPLETION] Ingredient processing completed for note ${data.noteId}. Categorization will be handled by note worker.`
          );
          success = true; // Mark as successful
        } else {
          deps.logger.log(
            `[CHECK_INGREDIENT_COMPLETION] Not all ingredients completed yet for note ${data.noteId} (${completionStatus.completedIngredients}/${completionStatus.totalIngredients}), retry ${retryCount + 1}/${maxRetries}`
          );

          if (retryCount < maxRetries - 1) {
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      } catch (error) {
        deps.logger.log(
          `[CHECK_INGREDIENT_COMPLETION] Error checking completion (attempt ${retryCount + 1}/${maxRetries}): ${error}`
        );

        if (retryCount < maxRetries - 1) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      retryCount++;
    }

    // Only mark as failed if we didn't succeed
    if (!success) {
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] All retries exhausted for note ${data.noteId}. Marking as failed.`
      );

      try {
        await markNoteAsFailed(
          data.noteId,
          `Ingredient completion check failed after ${maxRetries} attempts. Expected ${getIngredientCompletionStatus(data.noteId).totalIngredients} ingredients, got ${getIngredientCompletionStatus(data.noteId).completedIngredients}.`,
          "QUEUE_JOB_FAILED",
          {
            retryCount,
            maxRetries,
            noteId: data.noteId,
            importId: data.importId,
          },
          deps.logger
        );
      } catch (error) {
        deps.logger.log(
          `[CHECK_INGREDIENT_COMPLETION] Failed to mark note as failed: ${error}`
        );
      }
    } else {
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Successfully completed ingredient processing for note ${data.noteId}`
      );
    }

    return data;
  }
}

import { getIngredientCompletionStatus } from "@peas/database";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../../../workers/ingredient/dependencies";
import { markWorkerCompleted } from "../../../note/actions/track-completion/service";
import { scheduleCategorizationJob } from "../../../categorization/schedule-categorization";

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

    try {
      // Check actual completion status from database
      const completionStatus = await getIngredientCompletionStatus(data.noteId);

      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Completion status for note ${data.noteId}: ${completionStatus.completedIngredients}/${completionStatus.totalIngredients}`
      );

      // Only mark worker as completed if all ingredients are actually completed
      if (completionStatus.isComplete) {
        markWorkerCompleted(
          data.noteId,
          "ingredient",
          deps.logger,
          deps.statusBroadcaster
        );
        deps.logger.log(
          `[CHECK_INGREDIENT_COMPLETION] All ingredients completed for note ${data.noteId}, marked ingredient worker as completed`
        );

        // Schedule categorization after all ingredients are completed
        await this.scheduleCategorization(data, deps);
      } else {
        deps.logger.log(
          `[CHECK_INGREDIENT_COMPLETION] Not all ingredients completed yet for note ${data.noteId}, skipping worker completion`
        );
      }
    } catch (error) {
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Error checking completion: ${error}`
      );
    }

    return data;
  }

  private async scheduleCategorization(
    data: IngredientJobData,
    deps: IngredientWorkerDependencies
  ): Promise<void> {
    try {
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Scheduling categorization for note: ${data.noteId}`
      );

      // Use the shared categorization scheduling service
      await scheduleCategorizationJob(
        data.noteId,
        data.importId || "",
        deps.logger,
        deps.statusBroadcaster,
        data.jobId
      );

      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Successfully scheduled categorization for note: ${data.noteId}`
      );
    } catch (error) {
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Failed to schedule categorization for note ${data.noteId}: ${error}`
      );
    }
  }
}

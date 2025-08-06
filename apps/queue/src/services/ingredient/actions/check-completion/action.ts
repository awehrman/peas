import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../../../workers/ingredient/dependencies";
import { markWorkerCompleted } from "../../../note/actions/track-completion/service";

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
        `[CHECK_INGREDIENT_COMPLETION] No note ID available, skipping completion check`
      );
      return data;
    }

    try {
      // Mark the ingredient worker as completed for this note
      // This action should be called when all ingredient jobs for a note are finished
      markWorkerCompleted(
        data.noteId,
        "ingredient",
        deps.logger,
        deps.statusBroadcaster
      );
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Marked ingredient worker as completed for note ${data.noteId}`
      );
    } catch (error) {
      deps.logger.log(
        `[CHECK_INGREDIENT_COMPLETION] Error marking completion: ${error}`
      );
    }

    return data;
  }
}

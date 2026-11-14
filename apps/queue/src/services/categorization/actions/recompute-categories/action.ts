import { ActionName, LogLevel } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../../../workers/categorization/dependencies";

/** Derives a note's ingredient-rule categories once its lines are parsed. Failures are logged, not thrown: categories can be recomputed later and must not fail the import. */
export class RecomputeNoteCategoriesAction extends BaseAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  name = ActionName.RECOMPUTE_NOTE_CATEGORIES;

  async execute(
    data: CategorizationJobData,
    deps: CategorizationWorkerDependencies,
    _context: ActionContext
  ): Promise<CategorizationJobData> {
    try {
      return await deps.services.recomputeNoteCategories(data);
    } catch (error) {
      deps.logger.log(`[RECOMPUTE_CATEGORIES] note ${data.noteId} failed: ${error}`, LogLevel.WARN);
      if (data.kind === "RECOMPUTE_NOTE_CATEGORIES") throw error;
      return data;
    }
  }
}

export class RecomputeCategoryAction extends BaseAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  name = ActionName.RECOMPUTE_CATEGORY;

  async execute(
    data: CategorizationJobData,
    deps: CategorizationWorkerDependencies,
    _context: ActionContext
  ): Promise<CategorizationJobData> {
    return deps.services.recomputeCategory(data);
  }
}

export class RecomputeAllCategoriesAction extends BaseAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  name = ActionName.RECOMPUTE_ALL_CATEGORIES;

  async execute(
    data: CategorizationJobData,
    deps: CategorizationWorkerDependencies,
    _context: ActionContext
  ): Promise<CategorizationJobData> {
    return deps.services.recomputeAllCategories(data);
  }
}

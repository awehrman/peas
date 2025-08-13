import { ActionName } from "../../types";
import { ActionFactory } from "../../workers/core/action-factory";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../workers/categorization/dependencies";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

import { DetermineCategoryAction } from "./actions/determine-category/action";
import { SaveCategoryAction } from "./actions/save-category/action";
import { DetermineTagsAction } from "./actions/determine-tags/action";
import { SaveTagsAction } from "./actions/save-tags/action";

/**
 * Register all categorization actions in the given ActionFactory with type safety
 */
export function registerCategorizationActions(
  factory: ActionFactory<
    CategorizationJobData,
    CategorizationWorkerDependencies,
    CategorizationJobData
  >
): void {
  if (!factory || typeof factory !== "object") {
    throw new Error("Invalid factory");
  }

  registerActions(factory, [
    createActionRegistration<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >(ActionName.DETERMINE_CATEGORY, DetermineCategoryAction),
    createActionRegistration<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >(ActionName.SAVE_CATEGORY, SaveCategoryAction),
    createActionRegistration<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >(ActionName.DETERMINE_TAGS, DetermineTagsAction),
    createActionRegistration<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >(ActionName.SAVE_TAGS, SaveTagsAction),
  ]);
}

import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "./dependencies";

import { ActionName } from "../../types";
import type { ActionFactory } from "../core/action-factory";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * Creates the action pipeline for categorization processing using the factory approach.
 * @param actionFactory - The action factory to create actions
 * @param dependencies - Worker dependencies
 * @param data - Job data to determine conditional actions
 * @param context - Action context
 * @returns Array of categorization pipeline actions
 */
export function createCategorizationPipeline(
  actionFactory: ActionFactory<
    CategorizationJobData,
    CategorizationWorkerDependencies,
    CategorizationJobData
  >,
  dependencies: CategorizationWorkerDependencies,
  data: CategorizationJobData,
  _context: ActionContext
): WorkerAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
>[] {
  const actions: WorkerAction<
    CategorizationJobData,
    CategorizationWorkerDependencies,
    CategorizationJobData
  >[] = [];

  // Recompute jobs run a single action
  if (data.kind === "RECOMPUTE_NOTE_CATEGORIES") {
    return [actionFactory.create(ActionName.RECOMPUTE_NOTE_CATEGORIES, dependencies)];
  }
  if (data.kind === "RECOMPUTE_CATEGORY") {
    return [actionFactory.create(ActionName.RECOMPUTE_CATEGORY, dependencies)];
  }
  if (data.kind === "RECOMPUTE_ALL_CATEGORIES") {
    return [actionFactory.create(ActionName.RECOMPUTE_ALL_CATEGORIES, dependencies)];
  }

  try {
    // Determine category based on ingredients
    actions.push(
      actionFactory.create(ActionName.DETERMINE_CATEGORY, dependencies)
    );

    // Save the determined category
    actions.push(
      actionFactory.create(ActionName.SAVE_CATEGORY, dependencies)
    );

    // Determine tags based on ingredients
    actions.push(
      actionFactory.create(ActionName.DETERMINE_TAGS, dependencies)
    );

    // Save the determined tags
    actions.push(
      actionFactory.create(ActionName.SAVE_TAGS, dependencies)
    );

    // Derive categories from the parsed ingredients (food concepts and their relationships)
    actions.push(
      actionFactory.create(ActionName.RECOMPUTE_NOTE_CATEGORIES, dependencies)
    );
  } catch (error) {
    // Handle action creation errors
    dependencies.logger.log(
      `[CATEGORIZATION_PIPELINE] Error creating pipeline: ${error}`
    );
    throw error;
  }

  return actions;
}

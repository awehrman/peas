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
  _data: CategorizationJobData,
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

  return actions;
}

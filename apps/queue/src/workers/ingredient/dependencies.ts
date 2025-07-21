import type { IngredientWorkerDependencies } from "./types";

import type { IServiceContainer } from "../../services/container";
import { IngredientService } from "../../services/ingredient";
import { createBaseDependenciesFromContainer } from "../core/base-worker";

/**
 * Creates the dependencies object required by the IngredientWorker.
 * Wires together ingredient-specific and shared database functions.
 *
 * @param container - The service container providing access to core services and database methods.
 * @returns The dependencies object for the ingredient worker.
 */
export function createIngredientWorkerDependencies(
  container: IServiceContainer
): IngredientWorkerDependencies {
  const ingredientService = new IngredientService(container);

  return {
    ...createBaseDependenciesFromContainer(container),
    categorizationQueue: container.queues.categorizationQueue,
    database: container.database,
    parseIngredient: (text) => ingredientService.parseIngredient(text),
  };
}

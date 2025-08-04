import { ParseStatus } from "@peas/database";

import type { IServiceContainer } from "../../services/container";
import type { BaseWorkerDependencies } from "../types";

/**
 * Dependencies required by the IngredientWorker
 */
export interface IngredientWorkerDependencies extends BaseWorkerDependencies {
  /** Business logic services */
  services: {
    /**
     * Parse ingredient text (extract structured data)
     */
    parseIngredient: (
      data: IngredientJobData
    ) => Promise<IngredientJobData>;
    /**
     * Save ingredient to database
     */
    saveIngredient: (data: IngredientJobData) => Promise<IngredientJobData>;
  };
  /** Status broadcaster for completion messages */
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
}

/**
 * Job data for ingredient processing
 */
export interface IngredientJobData {
  noteId: string;
  ingredientReference: string;
  lineIndex: number;
  importId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
  parseStatus: ParseStatus;
  isActive: boolean;
}

/**
 * Build ingredient worker dependencies from the service container
 * @param serviceContainer The service container
 * @returns Ingredient worker dependencies
 */
export function buildIngredientDependencies(
  serviceContainer: IServiceContainer
): IngredientWorkerDependencies {
  return {
    logger: serviceContainer.logger,
    statusBroadcaster: serviceContainer.statusBroadcaster,
    services: {
      parseIngredient: async (data: IngredientJobData) => {
        // Import and use the actual parse ingredient service
        const { parseIngredientLine } = await import(
          "../../services/ingredient/actions/parse-ingredient-line/service"
        );
        return parseIngredientLine(data, serviceContainer.logger);
      },
      saveIngredient: async (data: IngredientJobData) => {
        // Import and use the actual save ingredient service
        const { saveIngredientLine } = await import(
          "../../services/ingredient/actions/save-ingredient-line/service"
        );
        return saveIngredientLine(
          data,
          serviceContainer.logger,
          serviceContainer.statusBroadcaster
        );
      },
    },
  };
} 
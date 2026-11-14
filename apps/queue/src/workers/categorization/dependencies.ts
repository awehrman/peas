import type { IServiceContainer } from "../../services/container";
import type { BaseWorkerDependencies } from "../types";

/**
 * Dependencies required by the CategorizationWorker
 */
export interface CategorizationWorkerDependencies extends BaseWorkerDependencies {
  /** Business logic services */
  services: {
    /**
     * Determine category for a note based on ingredients
     */
    determineCategory: (data: CategorizationJobData) => Promise<CategorizationJobData>;
    /**
     * Save category to database
     */
    saveCategory: (data: CategorizationJobData) => Promise<CategorizationJobData>;
    /**
     * Determine tags for a note based on ingredients
     */
    determineTags: (data: CategorizationJobData) => Promise<CategorizationJobData>;
    /**
     * Save tags to database
     */
    saveTags: (data: CategorizationJobData) => Promise<CategorizationJobData>;
    /**
     * Derive ingredient-rule categories for a note
     */
    recomputeNoteCategories: (data: CategorizationJobData) => Promise<CategorizationJobData>;
    /**
     * Recompute one category across the corpus after its rule changed
     */
    recomputeCategory: (data: CategorizationJobData) => Promise<CategorizationJobData>;
    /**
     * Recompute every ingredient-rule category after a knowledge change
     */
    recomputeAllCategories: (data: CategorizationJobData) => Promise<CategorizationJobData>;
  };
  /** Status broadcaster for completion messages */
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
}

/**
 * Job data for categorization processing
 */
export interface CategorizationJobData {
  noteId: string;
  importId: string;
  jobId: string;
  /** Recompute jobs; absent for the per-note import pipeline. */
  kind?: "RECOMPUTE_NOTE_CATEGORIES" | "RECOMPUTE_CATEGORY" | "RECOMPUTE_ALL_CATEGORIES";
  categoryId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Build categorization worker dependencies from the service container
 * @param serviceContainer The service container
 * @returns Categorization worker dependencies
 */
export function buildCategorizationDependencies(
  serviceContainer: IServiceContainer
): CategorizationWorkerDependencies {
  return {
    logger: serviceContainer.logger,
    statusBroadcaster: serviceContainer.statusBroadcaster,
    services: {
      determineCategory: async (data: CategorizationJobData) => {
        // Import and use the actual determine category service
        const { determineCategory } = await import(
          "../../services/categorization/actions/determine-category/service"
        );
        return determineCategory(data, serviceContainer.logger);
      },
      saveCategory: async (data: CategorizationJobData) => {
        // Import and use the actual save category service
        const { saveCategory } = await import(
          "../../services/categorization/actions/save-category/service"
        );
        return saveCategory(
          data,
          serviceContainer.logger,
          serviceContainer.statusBroadcaster
        );
      },
      determineTags: async (data: CategorizationJobData) => {
        // Import and use the actual determine tags service
        const { determineTags } = await import(
          "../../services/categorization/actions/determine-tags/service"
        );
        return determineTags(data, serviceContainer.logger);
      },
      saveTags: async (data: CategorizationJobData) => {
        // Import and use the actual save tags service
        const { saveTags } = await import(
          "../../services/categorization/actions/save-tags/service"
        );
        return saveTags(
          data,
          serviceContainer.logger,
          serviceContainer.statusBroadcaster
        );
      },
      recomputeNoteCategories: async (data: CategorizationJobData) => {
        const { recomputeCategoriesForNote } = await import(
          "../../services/categorization/actions/recompute-categories/service"
        );
        return recomputeCategoriesForNote(data, serviceContainer.logger);
      },
      recomputeCategory: async (data: CategorizationJobData) => {
        const { recomputeOneCategory } = await import(
          "../../services/categorization/actions/recompute-categories/service"
        );
        return recomputeOneCategory(data, serviceContainer.logger);
      },
      recomputeAllCategories: async (data: CategorizationJobData) => {
        const { recomputeEveryCategory } = await import(
          "../../services/categorization/actions/recompute-categories/service"
        );
        return recomputeEveryCategory(data, serviceContainer.logger);
      },
    },
  };
}

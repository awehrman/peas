/**
 * Shared types and factory functions for categorization jobs
 */

export interface CategorizationJobData {
  noteId: string;
  importId: string;
  jobId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Factory function to create standardized categorization job data
 */
export function createCategorizationJobData(
  noteId: string,
  importId: string,
  originalJobId?: string
): CategorizationJobData {
  return {
    noteId,
    importId,
    jobId: `categorization-${noteId}-${Date.now()}`,
    metadata: {
      originalJobId,
      triggeredBy: "ingredient_completion",
      scheduledAt: new Date().toISOString(),
    },
  };
}

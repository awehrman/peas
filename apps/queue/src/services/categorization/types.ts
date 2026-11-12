/**
 * Shared types and factory functions for categorization jobs
 */

export interface CategorizationJobData {
  noteId: string;
  importId: string;
  jobId: string;
  metadata?: Record<string, unknown>;
}

let lastJobTimestamp = 0;

/**
 * Factory function to create standardized categorization job data
 */
export function createCategorizationJobData(
  noteId: string,
  importId: string,
  originalJobId?: string
): CategorizationJobData {
  // Strictly increasing, so calls within the same millisecond stay unique
  const timestamp = Math.max(Date.now(), lastJobTimestamp + 1);
  lastJobTimestamp = timestamp;

  return {
    noteId,
    importId,
    jobId: `categorization-${noteId}-${timestamp}`,
    metadata: {
      originalJobId,
      triggeredBy: "ingredient_completion",
      scheduledAt: new Date().toISOString(),
    },
  };
}

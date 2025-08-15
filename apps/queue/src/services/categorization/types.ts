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
  // Add a small increment to ensure unique timestamps when called in quick succession
  const timestamp = Date.now() + Math.floor(Math.random() * 1000);
  
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

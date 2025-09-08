"use server";

import { getImportStats as getDbImportStats } from "@peas/database";
import type { ImportStatsState } from "@peas/features";

/**
 * Server action to fetch import statistics directly from database
 */
export async function getImportStats(): Promise<ImportStatsState> {
  try {
    // Query the database directly using the existing function
    const stats = await getDbImportStats();

    return {
      numberOfIngredients: stats.numberOfIngredients,
      numberOfNotes: stats.numberOfNotes,
      numberOfParsingErrors: stats.numberOfParsingErrors,
    };
  } catch (error) {
    console.error("Failed to fetch import stats:", error);

    // Re-throw the error to let the caller handle it appropriately
    // This prevents masking real database issues
    throw new Error(
      `Failed to fetch import stats: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Server action to refetch import statistics
 * Since we query the database directly, this is the same as getImportStats
 */
export async function refetchImportStats(): Promise<ImportStatsState> {
  return getImportStats();
}

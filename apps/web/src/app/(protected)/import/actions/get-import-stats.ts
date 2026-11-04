"use server";

import { getImportStats as getDbImportStats } from "@peas/database";
import type { ImportStatsState } from "@peas/features";

import { getAuthOrRedirect } from "../../../../lib/auth/queries/get-auth-or-redirect";

/**
 * Server action to fetch import statistics directly from database
 */
export async function getImportStats(): Promise<ImportStatsState> {
  await getAuthOrRedirect();

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

    // Return default stats instead of throwing to provide graceful fallback
    return {
      numberOfNotes: 0,
      numberOfIngredients: 0,
      numberOfParsingErrors: 0,
    };
  }
}

/**
 * Server action to refetch import statistics
 * Since we query the database directly, this is the same as getImportStats
 */
export async function refetchImportStats(): Promise<ImportStatsState> {
  return getImportStats();
}

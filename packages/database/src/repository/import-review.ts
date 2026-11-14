import { prisma } from "../client.js";
import { getBookLookupCounts } from "./book-lookup.js";
import { getDuplicateCounts } from "./duplicates.js";

export interface ImportReviewCountsRecord {
  pendingImports: number;
  importedNotes: number;
  exactDuplicates: number;
  likelyDuplicates: number;
  possibleDuplicates: number;
  sourceConflicts: number;
  bookMatchesToReview: number;
  failedSourceChecks: number;
  resolved: number;
}

/**
 * Counts for the import page's review tab.
 *
 * @example
 * await getImportReviewCounts() // { exactDuplicates: 3, bookMatchesToReview: 7, failedSourceChecks: 2, ... }
 */
export async function getImportReviewCounts(): Promise<ImportReviewCountsRecord> {
  const [duplicates, lookups, failedSourceChecks, pendingImports, importedNotes] = await Promise.all([
    getDuplicateCounts(),
    getBookLookupCounts(),
    prisma.uRL.count({ where: { checkStatus: { in: ["UNREACHABLE", "BLOCKED"] } } }),
    prisma.note.count({ where: { status: { in: ["PENDING", "PROCESSING"] }, archivedAt: null } }),
    prisma.note.count({ where: { status: "COMPLETED", archivedAt: null } }),
  ]);
  return {
    pendingImports,
    importedNotes,
    exactDuplicates: duplicates.EXACT,
    likelyDuplicates: duplicates.LIKELY,
    possibleDuplicates: duplicates.POSSIBLE,
    sourceConflicts: duplicates.sourceConflicts,
    bookMatchesToReview: lookups.AMBIGUOUS + lookups.NO_MATCH + lookups.ERROR,
    failedSourceChecks,
    resolved: duplicates.resolved,
  };
}

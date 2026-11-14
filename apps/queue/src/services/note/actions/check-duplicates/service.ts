import {
  findDuplicateMatches,
  getNoteWithIngredients,
  recordDuplicateCandidates,
  updateNoteTitleSimHash,
} from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import { generateTitleSimHash } from "../../../../utils/simhash";

/**
 * Looks for notes this one duplicates and records each pair as a DuplicateCandidate for review. Signals: the same uploaded file, identical normalized content, a shared source (normalized URL, redirect target, or book), and title SimHash with ingredient overlap. EXACT and LIKELY pairs hold the note as DUPLICATE until a reviewer decides on the import page; POSSIBLE pairs are only listed. Runs after sources are linked, so source signals are available.
 *
 * @example
 * await checkForDuplicates(data, logger) // { data, hasDuplicates: true } when an EXACT or LIKELY pair was found
 */
export async function checkForDuplicates(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<{ data: NotePipelineData; hasDuplicates: boolean }> {
  logger.log(
    `[CHECK_DUPLICATES] Starting duplicate check for note: ${data.noteId}`
  );

  if (!data.noteId) {
    throw new Error("Note ID is required for duplicate checking");
  }

  try {
    const currentNote = await getNoteWithIngredients(data.noteId);
    if (!currentNote) {
      throw new Error(`Note with ID ${data.noteId} not found`);
    }

    // The title SimHash and its bands feed the similar-title signal
    const titleSimHash = generateTitleSimHash(currentNote.title);
    if (titleSimHash && titleSimHash !== currentNote.titleSimHash) {
      await updateNoteTitleSimHash(data.noteId, titleSimHash);
    }

    const matches = await findDuplicateMatches(data.noteId);
    if (matches.length === 0) {
      logger.log(`[CHECK_DUPLICATES] No duplicates found for note: ${data.noteId}`);
      return { data, hasDuplicates: false };
    }

    const recorded = await recordDuplicateCandidates(data.noteId, matches);
    logger.log(
      `[CHECK_DUPLICATES] Note ${data.noteId}: ${matches.length} candidate(s) (${matches
        .map((match) => `${match.kind} ${Math.round(match.confidence * 100)}%`)
        .join(", ")})${recorded.blocking ? ", held for review" : ""}`
    );
    return { data, hasDuplicates: recorded.blocking };
  } catch (error) {
    logger.log(`[CHECK_DUPLICATES] Failed to check for duplicates: ${error}`);
    throw error;
  }
}

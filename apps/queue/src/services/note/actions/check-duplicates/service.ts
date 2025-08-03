import { getNoteWithIngredients, markNoteAsDuplicate } from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";

interface DuplicateMatch {
  noteId: string;
  title: string | null;
  confidence: number;
  matchReason: string;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  highestConfidence: number;
}

export async function checkForDuplicates(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  logger.log(
    `[CHECK_DUPLICATES] Starting duplicate check for note: ${data.noteId}`
  );

  try {
    // Get the current note with its ingredients
    if (!data.noteId) {
      throw new Error("Note ID is required for duplicate checking");
    }
    const currentNote = await getNoteWithIngredients(data.noteId);

    if (!currentNote) {
      throw new Error(`Note with ID ${data.noteId} not found`);
    }

    if (!currentNote.title) {
      logger.log(
        `[CHECK_DUPLICATES] Note ${data.noteId} has no title, skipping duplicate check`
      );
      return data;
    }

    // Check for duplicates based on title and ingredients
    const duplicateResult = await findDuplicateMatches(currentNote, logger);

    if (
      duplicateResult.isDuplicate &&
      duplicateResult.highestConfidence >= 0.9
    ) {
      logger.log(
        `[CHECK_DUPLICATES] High-confidence duplicate detected for note: ${data.noteId}. Confidence: ${duplicateResult.highestConfidence}`
      );

      // Mark the note as duplicate
      await markNoteAsDuplicate(data.noteId, {
        existingNotes: duplicateResult.matches.map((match) => ({
          id: match.noteId,
          title: match.title,
        })),
        duplicateReason: `High-confidence duplicate detected (${(duplicateResult.highestConfidence * 100).toFixed(1)}% match): ${duplicateResult.matches[0]?.matchReason || "Unknown match reason"}`,
        confidence: duplicateResult.highestConfidence,
      });

      logger.log(
        `[CHECK_DUPLICATES] Note ${data.noteId} marked as DUPLICATE with ${duplicateResult.highestConfidence * 100}% confidence`
      );
    } else if (duplicateResult.matches.length > 0) {
      logger.log(
        `[CHECK_DUPLICATES] Potential duplicates found but confidence too low (${duplicateResult.highestConfidence * 100}% < 90%). Keeping note as non-duplicate.`
      );
    } else {
      logger.log(
        `[CHECK_DUPLICATES] No duplicates found for note: ${data.noteId}`
      );
    }

    return data;
  } catch (error) {
    logger.log(`[CHECK_DUPLICATES] Failed to check for duplicates: ${error}`);
    throw error;
  }
}

async function findDuplicateMatches(
  currentNote: NonNullable<Awaited<ReturnType<typeof getNoteWithIngredients>>>,
  logger: StructuredLogger
): Promise<DuplicateCheckResult> {
  logger.log(
    `[CHECK_DUPLICATES] Checking for duplicates of: "${currentNote.title}"`
  );
  // This is a placeholder implementation
  // TODO: Implement actual duplicate detection logic
  // 1. Search for notes with similar titles
  // 2. Compare ingredient lists
  // 3. Calculate confidence scores
  // 4. Return matches above threshold

  // For now, return no duplicates
  // This will be implemented with actual database queries and matching logic
  return {
    isDuplicate: false,
    matches: [],
    highestConfidence: 0,
  };
}

import {
  findNotesWithSimilarTitles,
  getNoteWithIngredients,
  markNoteAsDuplicate,
  updateNoteTitleSimHash,
} from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import {
  calculateIngredientSimilarity,
  calculateSimilarityScore,
  generateTitleSimHash,
} from "../../../../utils/simhash";

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

    // Generate and save SimHash for the current note's title
    const currentTitleSimHash = generateTitleSimHash(currentNote.title);
    if (
      currentTitleSimHash &&
      currentTitleSimHash !== currentNote.titleSimHash
    ) {
      await updateNoteTitleSimHash(data.noteId, currentTitleSimHash);
      logger.log(
        `[CHECK_DUPLICATES] Updated SimHash for note ${data.noteId}: ${currentTitleSimHash}`
      );
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
      /* istanbul ignore next -- @preserve */
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

  // Generate SimHash for the current note's title
  const currentTitleSimHash = generateTitleSimHash(currentNote.title);

  if (!currentTitleSimHash) {
    logger.log(
      `[CHECK_DUPLICATES] Could not generate SimHash for title, skipping duplicate check`
    );
    return {
      isDuplicate: false,
      matches: [],
      highestConfidence: 0,
    };
  }

  logger.log(
    `[CHECK_DUPLICATES] Generated SimHash for title: ${currentTitleSimHash}`
  );

  // Find notes with similar titles using SimHash
  const similarNotes = await findNotesWithSimilarTitles(
    currentTitleSimHash,
    3, // maxHammingDistance
    currentNote.id
  );

  logger.log(
    `[CHECK_DUPLICATES] Found ${similarNotes.length} notes with similar titles`
  );

  const matches: DuplicateMatch[] = [];

  for (const similarNote of similarNotes) {
    if (!similarNote.titleSimHash || !similarNote.title) {
      continue;
    }

    // Calculate title similarity using SimHash
    const titleSimilarity = calculateSimilarityScore(
      currentTitleSimHash,
      similarNote.titleSimHash
    );

    // Calculate ingredient similarity using Jaccard similarity
    const currentIngredients = currentNote.parsedIngredientLines
      .map((line) => line.reference.toLowerCase().trim())
      .filter((ingredient) => ingredient.length > 0);

    // Get the similar note's ingredients for comparison
    const similarNoteWithIngredients = await getNoteWithIngredients(
      similarNote.id
    );
    const similarNoteIngredients =
      similarNoteWithIngredients?.parsedIngredientLines
        .map((line) => line.reference.toLowerCase().trim())
        .filter((ingredient) => ingredient.length > 0) || [];

    const ingredientSimilarity =
      currentIngredients.length > 0 && similarNoteIngredients.length > 0
        ? calculateIngredientSimilarity(
            currentIngredients,
            similarNoteIngredients
          )
        : 0.0;

    // Combine title and ingredient similarity for overall confidence
    // Weight title similarity more heavily (70% title, 30% ingredients)
    const overallConfidence =
      Math.round((titleSimilarity * 0.7 + ingredientSimilarity * 0.3) * 100) /
      100;

    if (overallConfidence >= 0.5) {
      // Lower threshold for potential matches
      matches.push({
        noteId: similarNote.id,
        title: similarNote.title,
        confidence: overallConfidence,
        matchReason: `Title similarity: ${(titleSimilarity * 100).toFixed(1)}%, Ingredient similarity: ${(ingredientSimilarity * 100).toFixed(1)}%`,
      });
    }
  }

  // Sort matches by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  /* istanbul ignore next -- @preserve */
  const highestConfidence =
    Math.round((matches.length > 0 ? matches[0]?.confidence || 0 : 0) * 100) /
    100;
  const isDuplicate = highestConfidence >= 0.9; // 90% confidence threshold

  logger.log(
    `[CHECK_DUPLICATES] Found ${matches.length} potential matches. Highest confidence: ${(highestConfidence * 100).toFixed(1)}%`
  );

  return {
    isDuplicate,
    matches,
    highestConfidence,
  };
}

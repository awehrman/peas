import { attachImportedSource } from "@peas/database";

import type { Queue } from "bullmq";

import { LogLevel, type StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import { enqueueBookLookup, enqueueUrlCheck } from "../../../source/enqueue";

export interface ProcessSourceQueues {
  sourceQueue?: Pick<Queue, "add">;
  bookLookupQueue?: Pick<Queue, "add">;
}

/**
 * Links the note's Evernote source to a structured source (a normalized URL, or text that may name a book) and queues the background work: a reachability check for a URL, a bibliographic lookup for new text. Failures are logged and never fail the import; the raw source stays on EvernoteMetadata either way.
 *
 * @example
 * await processSource(data, logger, deps.queues) // the note now has a NoteSource; "url-check-<id>" is queued
 */
export async function processSource(
  data: NotePipelineData,
  logger: StructuredLogger,
  queues: ProcessSourceQueues = {}
): Promise<NotePipelineData> {
  logger.log(
    `[PROCESS_SOURCE] Starting source processing for note: ${data.noteId}`
  );

  if (!data.noteId) {
    throw new Error("No note ID available for source processing");
  }

  const rawSource = data.file?.evernoteMetadata?.source;
  if (!rawSource?.trim()) {
    logger.log(`[PROCESS_SOURCE] No source found for note: ${data.noteId}`);
    return data;
  }

  try {
    const attached = await attachImportedSource(data.noteId, rawSource);
    if (!attached) {
      logger.log(`[PROCESS_SOURCE] Source "${rawSource}" has no usable text; kept on the Evernote metadata only`);
      return data;
    }
    logger.log(
      `[PROCESS_SOURCE] Linked note ${data.noteId} to ${attached.kind} source ${attached.sourceId}`
    );

    if (attached.urlIdToCheck && queues.sourceQueue) {
      await enqueueUrlCheck(queues.sourceQueue, attached.urlIdToCheck).catch((error: unknown) =>
        logger.log(`[PROCESS_SOURCE] Could not queue the URL check: ${error}`, LogLevel.WARN)
      );
    }
    if (attached.bookLookupIdToRun && queues.bookLookupQueue) {
      await enqueueBookLookup(queues.bookLookupQueue, attached.bookLookupIdToRun).catch((error: unknown) =>
        logger.log(`[PROCESS_SOURCE] Could not queue the book lookup: ${error}`, LogLevel.WARN)
      );
    }
  } catch (error) {
    logger.log(
      `[PROCESS_SOURCE] Failed to link the source for note ${data.noteId}, continuing the import: ${error}`,
      LogLevel.WARN
    );
  }

  return data;
}

import type { ParsedHTMLFile } from "@peas/database";
import { type NoteWithParsedLines, createNote, getNotes } from "@peas/database";
import { createHash } from "crypto";

import {
  CACHE_OPTIONS,
  CacheKeyGenerator,
  actionCache,
} from "../../workers/core/cache/action-cache";

// ============================================================================
// CACHED NOTE REPOSITORY
// ============================================================================

/**
 * Cached wrapper around the note repository
 * Adds caching for expensive database operations
 */
export class CachedNoteRepository {
  /**
   * Get all notes with caching
   */
  static async getNotes() {
    const cacheKey = CacheKeyGenerator.databaseQuery("get_notes");

    return actionCache.getOrSet(
      cacheKey,
      async () => {
        console.log(
          "[CACHED_NOTE_REPO] Cache miss for getNotes, querying database"
        );
        return getNotes();
      },
      CACHE_OPTIONS.DATABASE_QUERY
    );
  }

  /**
   * Create a note with cache invalidation
   */
  static async createNote(file: ParsedHTMLFile): Promise<NoteWithParsedLines> {
    // Create the note
    const result = await createNote(file);

    // Invalidate related caches
    await this.invalidateNoteCaches();

    return result;
  }

  /**
   * Get note metadata with caching
   */
  static async getNoteMetadata(noteId: string) {
    const cacheKey = CacheKeyGenerator.noteMetadata(noteId);

    return actionCache.getOrSet(
      cacheKey,
      async () => {
        console.log(
          `[CACHED_NOTE_REPO] Cache miss for note metadata ${noteId}, querying database`
        );
        // This would be implemented when we add metadata queries
        // For now, return null to indicate not found
        return null;
      },
      CACHE_OPTIONS.NOTE_METADATA
    );
  }

  /**
   * Get note status with caching
   */
  static async getNoteStatus(noteId: string) {
    const cacheKey = CacheKeyGenerator.noteStatus(noteId);

    return actionCache.getOrSet(
      cacheKey,
      async () => {
        console.log(
          `[CACHED_NOTE_REPO] Cache miss for note status ${noteId}, querying database`
        );
        // This would be implemented when we add status queries
        // For now, return null to indicate not found
        return null;
      },
      CACHE_OPTIONS.NOTE_METADATA
    );
  }

  /**
   * Invalidate all note-related caches
   */
  static async invalidateNoteCaches(): Promise<void> {
    try {
      // Invalidate note metadata caches
      await actionCache.invalidateByPattern("note:metadata:");

      // Invalidate note status caches
      await actionCache.invalidateByPattern("note:status:");

      // Invalidate database query caches
      await actionCache.invalidateByPattern("db:query:");

      console.log("[CACHED_NOTE_REPO] Successfully invalidated note caches");
    } catch (error) {
      console.warn(
        "[CACHED_NOTE_REPO] Failed to invalidate note caches:",
        error
      );
    }
  }

  /**
   * Invalidate caches for a specific note
   */
  static async invalidateNoteCache(noteId: string): Promise<void> {
    try {
      // Delete specific note caches
      await actionCache.delete(CacheKeyGenerator.noteMetadata(noteId));
      await actionCache.delete(CacheKeyGenerator.noteStatus(noteId));

      console.log(
        `[CACHED_NOTE_REPO] Successfully invalidated caches for note ${noteId}`
      );
    } catch (error) {
      console.warn(
        `[CACHED_NOTE_REPO] Failed to invalidate caches for note ${noteId}:`,
        error
      );
    }
  }
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Generate a hash for database query parameters
 */
export function hashQueryParams(...params: unknown[]): string {
  const queryString = JSON.stringify(params);
  return createHash("sha256").update(queryString).digest("hex");
}

/**
 * Cache wrapper for any database query
 */
export async function cachedQuery<T>(
  queryName: string,
  params: unknown[],
  queryFn: () => Promise<T>,
  options = CACHE_OPTIONS.DATABASE_QUERY
): Promise<T> {
  const queryHash = hashQueryParams(queryName, ...params);
  const cacheKey = CacheKeyGenerator.databaseQuery(queryHash);

  return actionCache.getOrSet(
    cacheKey,
    async () => {
      console.log(
        `[CACHED_QUERY] Cache miss for ${queryName}, executing query`
      );
      return queryFn();
    },
    options
  );
}

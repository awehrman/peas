import { addStatusEvent } from "@peas/database";
import type { NoteStatus } from "@peas/database";

import { broadcastStatusEvent } from "../services/websocket-server";

// Event deduplication cache
const eventCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 5000; // 5 seconds TTL for deduplication
const THROTTLE_MS = 50; // Reduced from 100ms to 50ms for more responsive updates

// Generate a unique key for event deduplication
function generateEventKey(event: {
  importId: string;
  noteId?: string;
  status: NoteStatus;
  context?: string;
  currentCount?: number;
  totalCount?: number;
}): string {
  // Don't include currentCount/totalCount in the key for progress updates
  // This prevents legitimate progress updates from being deduplicated
  if (
    event.context?.includes("processing") ||
    event.context?.includes("progress")
  ) {
    return `${event.importId}_${event.noteId || "no-note"}_${event.status}_${event.context || "no-context"}`;
  }

  return `${event.importId}_${event.noteId || "no-note"}_${event.status}_${event.context || "no-context"}_${event.currentCount || 0}_${event.totalCount || 0}`;
}

// Clean up expired cache entries
function cleanupEventCache() {
  const now = Date.now();
  for (const [key, value] of eventCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      eventCache.delete(key);
    }
  }
}

export async function addStatusEventAndBroadcast({
  importId,
  noteId,
  status,
  message,
  context,
  currentCount,
  totalCount,
  indentLevel,
  metadata,
}: {
  importId: string;
  noteId?: string;
  status: NoteStatus;
  message?: string;
  context?: string;
  currentCount?: number;
  totalCount?: number;
  indentLevel?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    // Clean up expired cache entries
    cleanupEventCache();

    // Generate event key for deduplication
    const eventKey = generateEventKey({
      importId,
      noteId,
      status,
      context,
      currentCount,
      totalCount,
    });

    const now = Date.now();
    const cachedEvent = eventCache.get(eventKey);

    // Check if this is a duplicate event within the throttle window
    // Skip deduplication for critical events (completion, failure, progress)
    const isCriticalEvent =
      status === "COMPLETED" ||
      status === "FAILED" ||
      context?.includes("progress") ||
      context?.includes("processing");

    if (
      !isCriticalEvent &&
      cachedEvent &&
      now - cachedEvent.timestamp < THROTTLE_MS
    ) {
      console.log(`🔄 [DEDUP] Skipping duplicate: ${eventKey} (age: ${now - cachedEvent.timestamp}ms)`);
      return cachedEvent.data;
    }

    // Log when critical events bypass deduplication
    if (isCriticalEvent && cachedEvent) {
      console.log(`🔄 [DEDUP] Critical event bypassing deduplication: ${eventKey}`);
    }

    // Add to database (only if we have a noteId)
    let dbEvent = null;
    if (noteId) {
      dbEvent = await addStatusEvent({
        noteId,
        status,
        message,
        context,
        currentCount,
        totalCount,
      });
    }

    // Create the event data
    const eventData = {
      importId,
      noteId,
      status,
      message,
      context,
      errorMessage: undefined, // Only set errorMessage for actual errors
      currentCount,
      totalCount,
      createdAt: dbEvent?.createdAt || new Date(),
      indentLevel,
      metadata,
    };

    // Cache the event
    eventCache.set(eventKey, {
      timestamp: now,
      data: dbEvent,
    });

    // Broadcast to WebSocket clients (always use importId for frontend grouping)
    if (status === "COMPLETED" || status === "FAILED") {
      console.log(`📤 [BROADCAST] Sending ${status}: ${importId} - ${context || 'no-context'}`);
    }
    broadcastStatusEvent(eventData);

    return dbEvent;
  } catch (error) {
    console.error("❌ Failed to add status event and broadcast:", error);
    throw error;
  }
}

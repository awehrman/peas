import { addStatusEvent } from "@peas/database";
import type { NoteStatus } from "@peas/database";

import { broadcastStatusEvent } from "../services/websocket-server";

// Event deduplication cache
const eventCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 10000; // Increased from 5s to 10s for better deduplication
const THROTTLE_MS = 200; // Increased from 50ms to 200ms to reduce false deduplication

// Event delivery monitoring
const eventDeliveryStats = {
  totalEvents: 0,
  criticalEvents: 0,
  completedEvents: 0,
  failedEvents: 0,
  deduplicatedEvents: 0,
  lastReset: Date.now(),
};

// Periodic cache cleanup to prevent memory leaks
setInterval(() => {
  const beforeSize = eventCache.size;
  cleanupEventCache();
  const afterSize = eventCache.size;
  if (beforeSize !== afterSize) {
    console.log(`🧹 [CACHE] Cleaned up ${beforeSize - afterSize} expired cache entries`);
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Reset stats every hour
setInterval(
  () => {
    console.log(`📊 [STATS] Event delivery stats:`, {
      totalEvents: eventDeliveryStats.totalEvents,
      criticalEvents: eventDeliveryStats.criticalEvents,
      completedEvents: eventDeliveryStats.completedEvents,
      failedEvents: eventDeliveryStats.failedEvents,
      deduplicatedEvents: eventDeliveryStats.deduplicatedEvents,
      period: "1 hour",
    });

    // Reset stats
    eventDeliveryStats.totalEvents = 0;
    eventDeliveryStats.criticalEvents = 0;
    eventDeliveryStats.completedEvents = 0;
    eventDeliveryStats.failedEvents = 0;
    eventDeliveryStats.deduplicatedEvents = 0;
    eventDeliveryStats.lastReset = Date.now();
  },
  60 * 60 * 1000
); // 1 hour

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
    event.context?.includes("progress") ||
    event.context?.includes("completion") ||
    event.context?.includes("worker")
  ) {
    return `${event.importId}_${event.noteId || "no-note"}_${event.status}_${event.context || "no-context"}`;
  }

  return `${event.importId}_${event.noteId || "no-note"}_${event.status}_${event.context || "no-context"}_${event.currentCount || 0}_${event.totalCount || 0}`;
}

// Clean up expired cache entries
function cleanupEventCache() {
  const now = Date.now();
  const maxCacheSize = 10000; // Prevent unlimited cache growth
  
  // If cache is too large, remove oldest entries first
  if (eventCache.size > maxCacheSize) {
    const entries = Array.from(eventCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, eventCache.size - maxCacheSize / 2);
    for (const [key] of toRemove) {
      eventCache.delete(key);
    }
  }
  
  // Remove expired entries
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
    // Track event statistics
    eventDeliveryStats.totalEvents++;
    if (status === "COMPLETED") eventDeliveryStats.completedEvents++;
    if (status === "FAILED") eventDeliveryStats.failedEvents++;

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
      context?.includes("processing") ||
      context?.includes("completion") ||
      context?.includes("worker") ||
      context?.includes("note_completion") ||
      context?.includes("mark_worker_completed");

    if (isCriticalEvent) {
      eventDeliveryStats.criticalEvents++;
    }

    if (
      !isCriticalEvent &&
      cachedEvent &&
      now - cachedEvent.timestamp < THROTTLE_MS
    ) {
      eventDeliveryStats.deduplicatedEvents++;
      console.log(`🔄 [DEDUP] Skipping duplicate: ${eventKey} (age: ${now - cachedEvent.timestamp}ms)`);
      return cachedEvent.data;
    }

    // Log when critical events bypass deduplication
    if (isCriticalEvent && cachedEvent) {
      console.log(
        `🔄 [DEDUP] Critical event bypassing deduplication: ${eventKey}`
      );
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
      console.log(
        `📤 [BROADCAST] Sending ${status}: ${importId} - ${context || "no-context"}`
      );
    } else if (isCriticalEvent) {
      console.log(
        `📤 [BROADCAST] Sending critical ${status}: ${importId} - ${context || "no-context"}`
      );
    }

    // Ensure WebSocket manager is available and broadcast
    try {
      const { initializeWebSocketServer } = await import(
        "../services/websocket-server"
      );
      const manager = initializeWebSocketServer();
      if (manager) {
        manager.broadcastStatusEvent(eventData);
      }
    } catch (error) {
      console.error(
        `❌ [BROADCAST] Failed to ensure WebSocket manager for critical event:`,
        error
      );
      // Fallback to regular broadcast if manager initialization fails
      broadcastStatusEvent(eventData);
    }

    return dbEvent;
  } catch (error) {
    console.error("❌ Failed to add status event and broadcast:", error);
    throw error;
  }
}

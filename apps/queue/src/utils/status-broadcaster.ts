import { addStatusEvent } from "@peas/database";
import type { NoteStatus } from "@peas/database";

import { broadcastStatusEvent } from "../services/websocket-server";

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

    // Broadcast to WebSocket clients (always use importId for frontend grouping)
    broadcastStatusEvent({
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
    });

    return dbEvent;
  } catch (error) {
    console.error("❌ Failed to add status event and broadcast:", error);
    throw error;
  }
}

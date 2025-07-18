import { addStatusEvent } from "@peas/database";
import type { NoteStatus } from "@peas/database";
import { broadcastStatusEvent } from "../websocket-server";

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
  console.log("[addStatusEventAndBroadcast] called with:", {
    importId,
    noteId,
    status,
    message,
    context,
    currentCount,
    totalCount,
    indentLevel,
    metadata,
  });
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
      console.log("[addStatusEventAndBroadcast] DB event created:", dbEvent);
    }

    // Broadcast to WebSocket clients (always use importId for frontend grouping)
    broadcastStatusEvent({
      importId,
      noteId,
      status,
      message,
      context,
      errorMessage: message,
      currentCount,
      totalCount,
      createdAt: dbEvent?.createdAt || new Date(),
      indentLevel,
      metadata,
    });

    console.log("[addStatusEventAndBroadcast] Broadcasted to websocket");

    return dbEvent;
  } catch (error) {
    console.error("❌ Failed to add status event and broadcast:", error);
    throw error;
  }
}

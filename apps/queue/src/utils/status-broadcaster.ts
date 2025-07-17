import { addStatusEvent } from "@peas/database";
import type { NoteStatus } from "@peas/database";
import { broadcastStatusEvent } from "../websocket-server";

export async function addStatusEventAndBroadcast({
  noteId,
  status,
  message,
  context,
  currentCount,
  totalCount,
}: {
  noteId: string;
  status: NoteStatus;
  message?: string;
  context?: string;
  currentCount?: number;
  totalCount?: number;
}) {
  console.log("[addStatusEventAndBroadcast] called with:", {
    noteId,
    status,
    message,
    context,
    currentCount,
    totalCount,
  });
  try {
    // Add to database
    const dbEvent = await addStatusEvent({
      noteId,
      status,
      message,
      context,
      currentCount,
      totalCount,
    });

    console.log("[addStatusEventAndBroadcast] DB event created:", dbEvent);

    // Broadcast to WebSocket clients
    broadcastStatusEvent({
      noteId,
      status,
      message,
      context,
      errorMessage: message,
      currentCount,
      totalCount,
      createdAt: dbEvent.createdAt,
    });

    console.log("[addStatusEventAndBroadcast] Broadcasted to websocket");

    return dbEvent;
  } catch (error) {
    console.error("❌ Failed to add status event and broadcast:", error);
    throw error;
  }
}

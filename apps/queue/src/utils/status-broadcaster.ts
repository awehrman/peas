import { addStatusEvent } from "@peas/database";
import type { NoteStatus } from "@peas/database";

import { broadcastStatusEvent } from "../services/websocket-server";

// Progress tracking by import ID
interface ImportProgress {
  importId: string;
  noteId?: string;
  steps: Map<string, StepProgress>;
  lastUpdate: number;
}

interface StepProgress {
  stepId: string;
  status: "pending" | "processing" | "completed" | "failed";
  message?: string;
  currentCount?: number;
  totalCount?: number;
  metadata?: Record<string, unknown>;
  lastUpdate: number;
}

// Track progress by import ID
const importProgress = new Map<string, ImportProgress>();

// Expected import steps and their contexts
const EXPECTED_STEPS: Record<string, readonly string[]> = {
  cleaning: ["clean_html_start", "clean_html_end"],
  saving_note: ["save_note"],
  ingredient_processing: ["ingredient_processing"],
  instruction_processing: ["instruction_processing"],
  connecting_source: ["source_connection"],
  adding_images: ["image_processing", "check_image_completion"],
  adding_categories: [
    "categorization_save",
    "categorization_save_complete",
    "categorization_complete",
  ],
  adding_tags: ["tag_save", "tag_save_complete", "tag_determination_complete"],
  check_duplicates: ["check_duplicates"],
} as const;

// Clean up old progress entries (older than 1 hour)
setInterval(
  () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [importId, progress] of importProgress.entries()) {
      if (progress.lastUpdate < oneHourAgo) {
        importProgress.delete(importId);
      }
    }
  },
  10 * 60 * 1000
); // Clean up every 10 minutes

function getStepIdFromContext(context: string): string | null {
  for (const [stepId, contexts] of Object.entries(EXPECTED_STEPS)) {
    if (contexts.includes(context)) {
      return stepId;
    }
  }
  return null;
}

function shouldSendUpdate(
  _progress: ImportProgress,
  _stepId: string,
  _newStatus: string,
  _newMessage?: string,
  _newCurrentCount?: number,
  _newTotalCount?: number
): boolean {
  // Always send updates - we'll handle throttling at the service level
  return true;
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
    // Allow all note processing contexts
    const allowedContexts = [
      "clean_html_start",
      "clean_html_end",
      "save_note",
      "ingredient_processing",
      "parse_ingredient_line",
      "save_ingredient_line",
      "instruction_processing",
      "format_instruction_line",
      "save_instruction_line",
      "source_connection",
      "image_processing",
      "categorization_save_complete",
      "categorization_save",
      "categorization_complete",
      "categorization_start",
      "tag_save_complete",
      "tag_save",
      "tag_determination_start",
      "tag_determination_complete",
      "check_duplicates",
      "note_completion",
    ];
    if (context && !allowedContexts.includes(context)) {
      console.log(
        `🔇 [BROADCAST] Unknown context, not broadcasting: ${context}`
      );
      return;
    }

    // Debug logging for clean_html events
    if (context === "clean_html_start" || context === "clean_html_end") {
      console.log(
        `🧹 [BROADCAST] Processing clean_html event: ${status} - ${importId} - ${context}`
      );
    }

    // Get or create progress tracking for this import
    let progress = importProgress.get(importId);
    if (!progress) {
      progress = {
        importId,
        noteId,
        steps: new Map(),
        lastUpdate: Date.now(),
      };
      importProgress.set(importId, progress);
    }

    // Update note ID if provided
    if (noteId) {
      progress.noteId = noteId;
    }

    // Determine step ID from context
    const stepId = context ? getStepIdFromContext(context) : null;

    if (!stepId) {
      // Unknown context, just broadcast directly
      await broadcastEvent({
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
      return null;
    }

    // Update step progress
    const stepProgress: StepProgress = {
      stepId,
      status:
        status === "COMPLETED"
          ? "completed"
          : status === "FAILED"
            ? "failed"
            : status === "PROCESSING"
              ? "processing"
              : "pending",
      message,
      currentCount,
      totalCount,
      metadata,
      lastUpdate: Date.now(),
    };

    // Check if we should send an update
    if (
      shouldSendUpdate(
        progress,
        stepId,
        stepProgress.status,
        stepProgress.message,
        stepProgress.currentCount,
        stepProgress.totalCount
      )
    ) {
      progress.steps.set(stepId, stepProgress);
      progress.lastUpdate = Date.now();

      // Add to database if we have a noteId
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

      // Broadcast the event
      await broadcastEvent({
        importId,
        noteId,
        status,
        message,
        context,
        currentCount,
        totalCount,
        indentLevel,
        metadata,
        createdAt: dbEvent?.createdAt || new Date(),
      });

      return dbEvent;
    }
  } catch (error) {
    console.error("❌ Failed to add status event and broadcast:", error);
    throw error;
  }
}

async function broadcastEvent(eventData: {
  importId: string;
  noteId?: string;
  status: NoteStatus;
  message?: string;
  context?: string;
  currentCount?: number;
  totalCount?: number;
  indentLevel?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}) {
  // Allow all note processing contexts
  const allowedContexts = [
    "clean_html_start",
    "clean_html_end",
    "save_note",
    "ingredient_processing",
    "parse_ingredient_line",
    "save_ingredient_line",
    "instruction_processing",
    "format_instruction_line",
    "save_instruction_line",
    "source_connection",
    "image_processing",
    "categorization_save_complete",
    "categorization_save",
    "categorization_complete",
    "categorization_start",
    "tag_save_complete",
    "tag_save",
    "tag_determination_start",
    "tag_determination_complete",
    "check_duplicates",
    "note_completion",
  ];
  if (eventData.context && !allowedContexts.includes(eventData.context)) {
    console.log(
      `🔇 [BROADCAST] Unknown context, not broadcasting: ${eventData.context}`
    );
    return;
  }

  const event = {
    importId: eventData.importId,
    noteId: eventData.noteId,
    status: eventData.status,
    message: eventData.message,
    context: eventData.context,
    errorMessage: undefined,
    currentCount: eventData.currentCount,
    totalCount: eventData.totalCount,
    createdAt: eventData.createdAt || new Date(),
    indentLevel: eventData.indentLevel,
    metadata: eventData.metadata,
  };

  // Log important events
  if (event.status === "COMPLETED" || event.status === "FAILED") {
    console.log(
      `📤 [BROADCAST] Sending ${event.status}: ${event.importId} - ${event.context || "no-context"}`
    );
  }

  // Debug logging for image_processing events
  if (event.context === "image_processing") {
    console.log(
      `🖼️ [BROADCAST] Sending image_processing event: ${event.status} - ${event.importId} - hasMetadata: ${!!event.metadata && Object.keys(event.metadata).length > 0}`
    );
  }

  // Debug logging for clean_html events
  if (
    event.context === "clean_html_start" ||
    event.context === "clean_html_end"
  ) {
    console.log(
      `🧹 [BROADCAST] Sending clean_html event: ${event.status} - ${event.importId} - ${event.context}`
    );
  }

  // Broadcast to WebSocket clients
  try {
    const { initializeWebSocketServer } = await import(
      "../services/websocket-server"
    );
    const manager = initializeWebSocketServer();
    if (manager) {
      // Debug logs for processing contexts with counts to trace 0/x, 1/x...
      if (
        (event.context === "ingredient_processing" ||
          event.context === "instruction_processing") &&
        event.status === "PROCESSING"
      ) {
        console.log(
          `📤 [BROADCAST] Processing progress: ${event.currentCount ?? "-"}/${event.totalCount ?? "-"} (${event.context}) importId=${event.importId} noteId=${event.noteId}`
        );
      }
      manager.broadcastStatusEvent(event);
    }
  } catch (error) {
    console.error(`❌ [BROADCAST] Failed to broadcast event:`, error);
    // Fallback to regular broadcast if manager initialization fails
    // Add debug on fallback path as well
    if (
      (event.context === "ingredient_processing" ||
        event.context === "instruction_processing") &&
      event.status === "PROCESSING"
    ) {
      console.log(
        `📤 [BROADCAST:FALLBACK] Processing progress: ${event.currentCount ?? "-"}/${event.totalCount ?? "-"} (${event.context}) importId=${event.importId} noteId=${event.noteId}`
      );
    }
    broadcastStatusEvent(event);
  }
}

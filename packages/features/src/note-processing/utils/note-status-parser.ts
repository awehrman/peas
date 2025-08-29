"use client";

import { StatusEvent } from "../../import-note-log/hooks/use-status-websocket";

export interface NoteProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  error?: string;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Normalize note processing context to step ID for proper grouping
 */
function normalizeNoteStepId(context: string): string {
  // Map different note processing contexts to the same step ID
  const normalizationMap: Record<string, string> = {
    // Note processing contexts
    save_note: "saving_note",
    note_creation: "saving_note",
    note_completion: "saving_note",
  };

  return normalizationMap[context] || context;
}

/**
 * Format note processing step name for display
 */
function formatNoteStepName(stepId: string): string {
  const nameMap: Record<string, string> = {
    saving_note: "Saving Note",
    note_creation: "Note Creation",
    note_completion: "Note Completion",
  };

  return nameMap[stepId] || stepId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Create note processing steps from events
 */
export function createNoteProcessingSteps(events: StatusEvent[]): NoteProcessingStep[] {
  const stepMap = new Map<string, NoteProcessingStep>();

  // Process events in chronological order so newer events win
  const eventsChrono = [...events].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return aTime - bTime;
  });

  for (const event of eventsChrono) {
    const context = event.context || "unknown";
    
    // Only process note-related events
    if (!context.includes("note") && !context.includes("save_note")) {
      continue;
    }
    
    // Normalize context for step grouping
    const normalizedStepId = normalizeNoteStepId(context);
    const stepId = normalizedStepId;

    if (!stepMap.has(stepId)) {
      stepMap.set(stepId, {
        id: stepId,
        name: formatNoteStepName(stepId),
        status: "pending",
      });
    }

    const step = stepMap.get(stepId)!;

    // Update step status based on event
    if (event.status === "COMPLETED") {
      step.status = "completed";
      step.completedAt = new Date(event.createdAt);
    } else if (event.status === "FAILED") {
      step.status = "failed";
      step.error = event.message || "Unknown error";
    } else if (event.status === "PROCESSING") {
      step.status = "processing";
    }

    // Update progress if available (never regress counts)
    if (event.currentCount !== undefined && event.totalCount !== undefined) {
      // Do not decrease progress if an older/lower count arrives later
      const existing = step.progress;
      if (!existing || event.currentCount > existing.current) {
        step.progress = {
          current: event.currentCount,
          total: event.totalCount,
          percentage: Math.round((event.currentCount / event.totalCount) * 100),
        };
      }
    } else if (
      event.status === "COMPLETED" &&
      step.progress &&
      step.progress.total > 0
    ) {
      // For completion events without explicit counts, set progress to 100%
      step.progress = {
        current: step.progress.total,
        total: step.progress.total,
        percentage: 100,
      };
    }

    // Merge metadata
    if (event.metadata) {
      step.metadata = { ...step.metadata, ...event.metadata };
    }
  }

  return Array.from(stepMap.values());
}

/**
 * Check if an event is note-related
 */
export function isNoteProcessingEvent(event: StatusEvent): boolean {
  const context = event.context || "";
  return context.includes("note") || context.includes("save_note");
}

/**
 * Get note processing events from a list of events
 */
export function getNoteProcessingEvents(events: StatusEvent[]): StatusEvent[] {
  return events.filter(isNoteProcessingEvent);
}

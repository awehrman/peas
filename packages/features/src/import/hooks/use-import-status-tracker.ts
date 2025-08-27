import { useCallback, useEffect, useMemo } from "react";

import { useImportState } from "../contexts";
import { ImportStatusTracker } from "../contexts";
import { BASE_STEP_DEFS, STATUS } from "../utils/status";
import { createProcessingSteps } from "../utils/status-parser";

export function useImportStatusTracker() {
  const { state, dispatch } = useImportState();
  const { events } = state;

  // Memoize the trackers to prevent unnecessary re-renders
  const trackers = useMemo(() => {
    const trackerMap = new Map<string, ImportStatusTracker>();

    for (const event of events) {
      const importId = event.importId;

      if (!trackerMap.has(importId)) {
        // Initialize new tracker
        trackerMap.set(importId, {
          importId,
          status: "importing",
          createdAt: new Date(event.createdAt),
          lastEventAt: new Date(event.createdAt),
          eventCount: 0,
          completionPercentage: 0,
          metadata: {},
          stages: {
            noteCreated: false,
            ingredientsProcessed: false,
            instructionsProcessed: false,
            imagesAdded: false,
            categoriesAdded: false,
            tagsAdded: false,
          },
        });
      }

      const tracker = trackerMap.get(importId)!;

      // Update tracker with event data
      tracker.eventCount++;
      tracker.lastEventAt = new Date(event.createdAt);

      // Update metadata
      if (event.metadata?.noteTitle && !tracker.metadata.noteTitle) {
        tracker.metadata.noteTitle = event.metadata.noteTitle as string;
      }
      if (event.metadata?.htmlFileName && !tracker.metadata.htmlFileName) {
        tracker.metadata.htmlFileName = event.metadata.htmlFileName as string;
      }
      if (event.metadata?.noteId && !tracker.metadata.noteId) {
        tracker.metadata.noteId = event.metadata.noteId as string;
      }

      // Update completion stages based on context
      if (
        event.context?.includes("note_created") ||
        event.context?.includes("note_completion")
      ) {
        tracker.stages.noteCreated = true;
      }
      if (
        event.context?.includes("ingredient") ||
        event.context?.includes("ingredients")
      ) {
        tracker.stages.ingredientsProcessed = true;
      }
      if (
        event.context?.includes("instruction") ||
        event.context?.includes("instructions")
      ) {
        tracker.stages.instructionsProcessed = true;
      }
      if (
        event.context?.includes("image") ||
        event.context?.includes("images")
      ) {
        tracker.stages.imagesAdded = true;
      }
      if (
        event.context?.includes("categorization") ||
        event.context?.includes("category")
      ) {
        tracker.stages.categoriesAdded = true;
      }
      if (event.context?.includes("tag") || event.context?.includes("tags")) {
        tracker.stages.tagsAdded = true;
      }

      // Update completion status - use same logic as useImportItems
      if (
        event.status === "COMPLETED" &&
        (event.context === "note_completion" ||
          event.context === "mark_note_worker_completed" ||
          event.message?.includes("completed successfully"))
      ) {
        tracker.status = "completed";
        tracker.completedAt = new Date(event.createdAt);
        tracker.completionPercentage = 100;
      } else if (event.status === "FAILED") {
        tracker.status = "failed";
        tracker.completedAt = new Date(event.createdAt);
        tracker.completionPercentage = 0;
      } else {
        // Calculate completion percentage using the same logic as the status bar
        if (tracker.status === "importing") {
          // Get all events for this import
          const importEvents = events.filter((e) => e.importId === importId);
          const processingSteps = createProcessingSteps(importEvents);

          // Use the same logic as ProgressStatusBar
          const byId = new Map();
          for (const step of processingSteps) {
            byId.set(step.id, step);
          }

          const derivedSteps = BASE_STEP_DEFS.map((def) => {
            const chosen = byId.get(def.id);
            return {
              id: def.id,
              name: def.name,
              status: chosen?.status ?? STATUS.PENDING,
              message: chosen?.message ?? "",
              progress: chosen?.progress,
              metadata: chosen?.metadata,
            };
          });

          const totalSteps = BASE_STEP_DEFS.length;
          const completedSteps = derivedSteps.filter(
            (step) => step.status === STATUS.COMPLETED
          ).length;
          let progressPercentage =
            totalSteps > 0
              ? Math.round((completedSteps / totalSteps) * 100)
              : 0;

          // If note completion has been received, force overall progress to 100%
          const noteCompleted = processingSteps.some(
            (s) => s.id === "note_completion" && s.status === STATUS.COMPLETED
          );
          if (noteCompleted) {
            progressPercentage = 100;
          }

          tracker.completionPercentage = progressPercentage;
        }
      }
    }

    return trackerMap;
  }, [events]);

  // Update import status trackers when events change
  useEffect(() => {
    for (const [importId, tracker] of trackers.entries()) {
      dispatch({
        type: "IMPORT_STATUS_UPDATED",
        payload: { importId, tracker },
      });
    }
  }, [trackers, dispatch]);

  // Get all trackers
  const allTrackers = useMemo(() => {
    return Array.from(state.importStatusTracker.values());
  }, [state.importStatusTracker]);

  // Get tracker by importId
  const getTracker = useCallback(
    (importId: string) => {
      return state.importStatusTracker.get(importId);
    },
    [state.importStatusTracker]
  );

  // Get trackers by status
  const getTrackersByStatus = useCallback(
    (status: "importing" | "completed" | "failed") => {
      return allTrackers.filter((tracker) => tracker.status === status);
    },
    [allTrackers]
  );

  // Get completion statistics
  const completionStats = useMemo(() => {
    const total = allTrackers.length;
    const completed = allTrackers.filter(
      (t) => t.status === "completed"
    ).length;
    const failed = allTrackers.filter((t) => t.status === "failed").length;
    const importing = allTrackers.filter(
      (t) => t.status === "importing"
    ).length;

    return {
      total,
      completed,
      failed,
      importing,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [allTrackers]);

  return {
    allTrackers,
    getTracker,
    getTrackersByStatus,
    completionStats,
  };
}

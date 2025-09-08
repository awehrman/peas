"use client";

import { useCallback, useRef } from "react";

import { useStats } from "../context/stats/stats-provider";
import { useImportUpload } from "../context/upload/upload-provider";
import type { ImportStatsState, StatusEvent } from "../types/import-types";

/**
 * Hook to integrate WebSocket status updates with upload context
 * This connects real-time processing updates from the queue to the upload UI
 */
export function useWebSocketUploadIntegration(
  onStatsRefresh?: () => Promise<ImportStatsState>
) {
  const { dispatch } = useImportUpload();
  const { dispatch: statsDispatch } = useStats();

  // Track ongoing refresh to prevent race conditions
  const refreshInProgress = useRef(false);

  // Function to refresh stats from the server
  const refreshStats = useCallback(async () => {
    if (!onStatsRefresh) {
      console.warn("No stats refresh function provided");
      return;
    }

    // Prevent concurrent refresh calls
    if (refreshInProgress.current) {
      return;
    }

    refreshInProgress.current = true;

    try {
      const newStats = await onStatsRefresh();

      // Update the stats context with fresh data
      statsDispatch({
        type: "REFRESH_STATS",
        stats: newStats,
      });
    } catch (error) {
      console.error("Failed to refresh stats:", error);
      // Note: We don't update the UI with error state here to avoid disrupting the user experience
      // The stats will remain at their last known good state
    } finally {
      refreshInProgress.current = false;
    }
  }, [statsDispatch, onStatsRefresh]);

  const handleStatusUpdate = useCallback(
    (statusEvent: StatusEvent) => {
      const { importId, status, progress, message } = statusEvent;

      // Update all files in the current batch that match this importId
      // Note: This is a simplified approach. In a production system, you might want
      // to maintain a mapping of importId to specific file IDs for more granular updates

      if (
        status === "processing_started" ||
        status === "processing_progress" ||
        status === "PROCESSING"
      ) {
        // Update all files in the batch to uploading status
        // We'll use a special action to update all files in a batch
        dispatch({
          type: "UPDATE_BATCH_STATUS",
          importId,
          status: "uploading",
          progress: progress || 0,
        });
      } else if (status === "processing_completed" || status === "COMPLETED") {
        // Mark all files as completed
        dispatch({
          type: "UPDATE_BATCH_STATUS",
          importId,
          status: "completed",
          progress: 100,
        });

        // Complete the batch
        dispatch({
          type: "COMPLETE_BATCH",
          successMessage: message || "Processing completed successfully",
        });

        // Refresh stats when note processing is completed
        refreshStats();
      } else if (status === "processing_failed" || status === "FAILED") {
        // Mark all files as failed
        dispatch({
          type: "UPDATE_BATCH_STATUS",
          importId,
          status: "failed",
          error: message || "Processing failed",
        });

        // Fail the batch
        dispatch({
          type: "FAIL_BATCH",
          errorMessage: message || "Processing failed",
        });
      }
    },
    [dispatch, refreshStats]
  );

  return { handleStatusUpdate, refreshStats };
}

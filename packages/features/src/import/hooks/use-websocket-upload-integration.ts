"use client";

import { useCallback, useEffect, useRef } from "react";

import { useStats } from "../context/stats/stats-provider";
import type { ImportStatsState, StatusEvent } from "../types/import-types";

/** Each note completes dozens of steps; refresh the counts at most this often */
export const STATS_REFRESH_INTERVAL_MS = 2000;

/**
 * Hook to integrate WebSocket status updates with the import stats.
 * Upload batches are finished by the upload request itself; queue events
 * belong to notes that may have been uploaded long before, so they only
 * refresh the counts.
 */
export function useWebSocketUploadIntegration(
  onStatsRefresh?: () => Promise<ImportStatsState>
) {
  const { dispatch: statsDispatch } = useStats();

  const refreshInProgress = useRef(false);
  const lastRefreshAt = useRef(0);
  const trailingRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (trailingRefresh.current) clearTimeout(trailingRefresh.current);
    },
    []
  );

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
    lastRefreshAt.current = Date.now();

    try {
      const newStats = await onStatsRefresh();

      statsDispatch({
        type: "REFRESH_STATS",
        stats: newStats,
      });
    } catch (error) {
      console.error("Failed to refresh stats:", error);
      // The stats keep their last known good state
    } finally {
      refreshInProgress.current = false;
    }
  }, [statsDispatch, onStatsRefresh]);

  // Refreshes now if the interval has passed, and always once more after the
  // last event so the final counts are accurate
  const scheduleStatsRefresh = useCallback(() => {
    if (trailingRefresh.current) clearTimeout(trailingRefresh.current);

    const elapsed = Date.now() - lastRefreshAt.current;
    if (elapsed >= STATS_REFRESH_INTERVAL_MS) void refreshStats();

    trailingRefresh.current = setTimeout(() => {
      trailingRefresh.current = null;
      void refreshStats();
    }, STATS_REFRESH_INTERVAL_MS);
  }, [refreshStats]);

  const handleStatusUpdate = useCallback(
    (statusEvent: StatusEvent) => {
      if (statusEvent.status === "COMPLETED" || statusEvent.status === "processing_completed") {
        scheduleStatsRefresh();
      }
    },
    [scheduleStatsRefresh]
  );

  return { handleStatusUpdate, refreshStats };
}

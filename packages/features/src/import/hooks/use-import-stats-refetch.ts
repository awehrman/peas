"use client";

import { useStatusWebSocket } from "./use-status-websocket";

import { useEffect, useState } from "react";

import { getImportStats } from "../actions/get-import-stats";
import { ImportStats } from "../components/layout/import-page";

interface UseImportStatsRefetchProps {
  initialStats: ImportStats;
}

interface UseImportStatsRefetchReturn {
  stats: ImportStats;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

export function useImportStatsRefetch({
  initialStats,
}: UseImportStatsRefetchProps): UseImportStatsRefetchReturn {
  const [stats, setStats] = useState<ImportStats>(initialStats);
  const [isRefetching, setIsRefetching] = useState(false);

  const { events } = useStatusWebSocket({
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  const refetch = async () => {
    setIsRefetching(true);
    try {
      const newStats = await getImportStats();
      setStats(newStats);
    } catch (error) {
      console.error("Failed to refetch import stats:", error);
    } finally {
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    // Listen for note completion events that should trigger stats refetch
    const shouldRefetchEvents = events.filter((event) => {
      // Check for note completion events
      if (event.status === "COMPLETED" && event.context === "note_completion") {
        return true;
      }

      return false;
    });

    if (shouldRefetchEvents.length > 0) {
      console.log(
        "Stats refetch triggered by note completion event:",
        shouldRefetchEvents[0]
      );
      refetch();
    }
  }, [events]);

  return {
    stats,
    isRefetching,
    refetch,
  };
}

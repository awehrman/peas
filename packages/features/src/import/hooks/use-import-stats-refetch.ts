"use client";

import { useEffect, useState } from "react";
import { useStatusWebSocket } from "./use-status-websocket";
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
    // Listen for specific events that should trigger stats refetch
    const shouldRefetchEvents = events.filter((event) => {
      // Check for save note completion events
      if (event.status === "COMPLETED" && event.context === "save_note") {
        return true;
      }
      
      // Check for ingredient processing completion
      if (event.status === "COMPLETED" && event.context === "parse_html_ingredients") {
        return true;
      }
      
      // Check for new ingredient notifications
      if (event.context === "ingredient_created" || event.context === "ingredient_updated") {
        return true;
      }
      
      // Check for note save completion (alternative event types)
      if (event.context === "note_saved" || event.context === "save_note_completed") {
        return true;
      }
      
      return false;
    });

    if (shouldRefetchEvents.length > 0) {
      console.log("Stats refetch triggered by event:", shouldRefetchEvents[shouldRefetchEvents.length - 1]);
      refetch();
    }
  }, [events]);

  return {
    stats,
    isRefetching,
    refetch,
  };
}
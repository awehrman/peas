"use client";

import { useEffect, useState } from "react";

import { getImportStats } from "../actions/get-import-stats";
import { ImportStats } from "../components/layout/import-page";
import { useImportState } from "../contexts/import-state-context";

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

  const { state } = useImportState();
  const { events } = state;

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
      refetch();
    }
  }, [events]);

  return {
    stats,
    isRefetching,
    refetch,
  };
}

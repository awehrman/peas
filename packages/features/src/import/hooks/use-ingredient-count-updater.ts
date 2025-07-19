"use client";

import { useEffect, useState } from "react";
import { useStatusWebSocket } from "./use-status-websocket";

interface UseIngredientCountUpdaterProps {
  wsUrl: string;
  initialCount?: number;
}

export function useIngredientCountUpdater({
  wsUrl,
  initialCount = 0,
}: UseIngredientCountUpdaterProps) {
  const [ingredientCount, setIngredientCount] = useState(initialCount);
  const { events } = useStatusWebSocket({
    wsUrl,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  useEffect(() => {
    // Listen for instruction count update events
    const instructionCountEvents = events.filter(
      (event) =>
        event.context === "parse_html_instructions" &&
        event.metadata?.totalInstructions &&
        typeof event.metadata?.processedInstructions === "number"
    );

    if (instructionCountEvents.length > 0) {
      // Get the latest event
      const latestEvent =
        instructionCountEvents[instructionCountEvents.length - 1];
      if (latestEvent) {
        const processedCount = latestEvent.metadata
          ?.processedInstructions as number;

        // Update the ingredient count (this is a placeholder - you might want to update a different count)
        // For now, we'll just use the processed instruction count as a demonstration
        setIngredientCount(processedCount);
      }
    }
  }, [events]);

  return { ingredientCount, setIngredientCount };
}

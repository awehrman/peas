"use client";

import { useEffect, useState } from "react";

import { useImportState } from "../contexts/import-state-context";

interface UseIngredientCountUpdaterProps {
  wsUrl: string;
  initialCount?: number;
}

export function useIngredientCountUpdater({
  initialCount = 0,
}: Omit<UseIngredientCountUpdaterProps, "wsUrl">) {
  const [ingredientCount, setIngredientCount] = useState(initialCount);
  const { state } = useImportState();
  const { events } = state;

  useEffect(() => {
    // Listen for instruction count update events
    const instructionCountEvents = events.filter(
      (event: any) =>
        (event.context === "parse_html_ingredients" ||
          event.context === "process_ingredients") &&
        typeof event.metadata?.processedInstructions === "number"
    ) as any[];

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

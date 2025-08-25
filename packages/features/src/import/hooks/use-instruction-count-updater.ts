"use client";

import { useEffect, useState } from "react";

import { useImportState } from "../contexts/import-state-context";

interface UseInstructionCountUpdaterProps {
  wsUrl?: string; // Optional now since context handles it
  initialCount?: number;
}

export function useInstructionCountUpdater({
  initialCount = 0,
}: Omit<UseInstructionCountUpdaterProps, "wsUrl">) {
  const [instructionCount, setInstructionCount] = useState(initialCount);
  const [totalInstructions, setTotalInstructions] = useState(0);
  const { state } = useImportState();
  const { events } = state;

  useEffect(() => {
    // Listen for instruction count update events
    const instructionCountEvents = events.filter(
      (event) =>
        (event.context === "parse_html_instructions" ||
          event.context === "process_instructions") &&
        typeof event.metadata?.processedInstructions === "number"
    );
    if (instructionCountEvents.length > 0) {
      // Get the latest event
      const latestEvent =
        instructionCountEvents[instructionCountEvents.length - 1];
      if (latestEvent) {
        const processedCount = latestEvent.metadata
          ?.processedInstructions as number;
        const totalCount = latestEvent.metadata?.totalInstructions as number;

        setInstructionCount(processedCount);
        setTotalInstructions(totalCount);
      }
    }
  }, [events]);

  return { instructionCount, totalInstructions, setInstructionCount };
}

"use client";

import { useEffect, useState } from "react";
import { useStatusWebSocket } from "./use-status-websocket";

interface UseInstructionCountUpdaterProps {
  wsUrl: string;
  initialCount?: number;
}

export function useInstructionCountUpdater({
  wsUrl,
  initialCount = 0,
}: UseInstructionCountUpdaterProps) {
  const [instructionCount, setInstructionCount] = useState(initialCount);
  const [totalInstructions, setTotalInstructions] = useState(0);
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
        const totalCount = latestEvent.metadata?.totalInstructions as number;

        setInstructionCount(processedCount);
        setTotalInstructions(totalCount);
      }
    }
  }, [events]);

  return { instructionCount, totalInstructions, setInstructionCount };
}

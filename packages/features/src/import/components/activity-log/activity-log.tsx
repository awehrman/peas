"use client";

import { ActivityGroup } from "./activity-group";
import { ConnectionStatus } from "./connection-status";

import { ReactNode, useMemo } from "react";

import { getWebSocketUrl } from "../../../utils/websocket-config";
import { useStatusWebSocket } from "../../hooks/use-status-websocket";
import { Item, groupStatusItemsByImport } from "../../utils";

interface Props {
  className?: string;
}

export function ActivityLog({ className }: Props): ReactNode {
  const { events, connectionStatus, error } = useStatusWebSocket({
    wsUrl: getWebSocketUrl(),
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // Debug: log all events
  console.log(
    `[ActivityLog] Received ${events.length} events:`,
    events.map((e) => ({
      context: e.context,
      message: e.message,
      importId: e.importId,
    }))
  );

  // Convert WebSocket events to Item format, filtering out "Cleaning HTML file..." messages
  const items: Item[] = useMemo(() => {
    // Track instruction count updates by importId
    const instructionCounts = new Map<
      string,
      { processed: number; total: number }
    >();

    // Track completed instruction line indexes to avoid duplicates
    const completedInstructions = new Map<string, Set<number>>();

    // First pass: collect instruction count updates
    events.forEach((event) => {
      if (
        event.context === "process_instructions" &&
        event.importId &&
        event.metadata
      ) {
        const processed = event.metadata.processedInstructions as number;
        const total = event.metadata.totalInstructions as number;
        if (typeof processed === "number" && typeof total === "number") {
          console.log(
            `[ActivityLog] Instruction count update: ${processed}/${total} for import ${event.importId}`
          );
          instructionCounts.set(event.importId, { processed, total });
        }
      }

      // Track instruction completion events
      if (
        event.context === "instruction_completed" &&
        event.importId &&
        event.metadata
      ) {
        const total = event.metadata.totalInstructions as number;
        const lineIndex = event.metadata.lineIndex as number;
        if (typeof total === "number" && typeof lineIndex === "number") {
          // Initialize the set for this import if it doesn't exist
          if (!completedInstructions.has(event.importId)) {
            completedInstructions.set(event.importId, new Set());
          }

          const completedSet = completedInstructions.get(event.importId)!;

          // Only count this instruction if we haven't seen this lineIndex before
          if (!completedSet.has(lineIndex)) {
            completedSet.add(lineIndex);

            const existing = instructionCounts.get(event.importId);
            const currentProcessed = existing ? existing.processed : 0;
            const newProcessed = currentProcessed + 1;

            console.log(
              `[ActivityLog] Instruction completed: ${newProcessed}/${total} for import ${event.importId} (lineIndex: ${lineIndex})`
            );
            instructionCounts.set(event.importId, {
              processed: newProcessed,
              total,
            });
          } else {
            console.log(
              `[ActivityLog] Skipping duplicate instruction completion for lineIndex: ${lineIndex}`
            );
          }
        }
      }
    });

    // Filter and process events
    const filteredEvents = events.filter((event) => {
      const ctx = (event.context || "").toLowerCase();
      const message = (
        event.errorMessage ||
        event.message ||
        event.context ||
        `Status ${event.status}`
      ).toLowerCase();

      // Hide low-level worker messages
      if (ctx === "format_instruction" || ctx === "save_instruction")
        return false;
      if (message.startsWith("starting to process instructions")) return false;
      if (message.includes("cleaning html file")) return false;

      // Hide process_instructions events since we're updating the parse_html_instructions message
      if (event.context === "process_instructions") return false;

      // Hide instruction_completed events since we're using them for counting
      if (event.context === "instruction_completed") return false;

      return true;
    });

    return filteredEvents.map((event) => {
      let text =
        event.errorMessage ||
        event.message ||
        event.context ||
        `Status ${event.status}`;

      // Update instruction count messages with latest progress
      if (event.context === "parse_html_instructions" && event.importId) {
        const countData = instructionCounts.get(event.importId);
        if (countData) {
          text = `${countData.processed}/${countData.total} instructions`;
        }
      }

      return {
        id: `${event.importId}-${new Date(event.createdAt).getTime()}`,
        text,
        indentLevel: event.indentLevel ?? 0, // Use explicit indentLevel from WebSocket, default to 0
        importId: event.importId, // Include importId for grouping
        timestamp: new Date(event.createdAt), // Include timestamp for sorting
        metadata: event.metadata, // Include metadata for additional info like note title
        context: event.context, // Include context for operation type
      };
    });
  }, [events]);

  // Group items by import ID first, then by operation type within each import
  const importGroups = groupStatusItemsByImport(items);

  if (importGroups.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Activity Log
        </h3>
        <ConnectionStatus
          connectionStatus={connectionStatus}
          error={error || undefined}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recently Added
      </h3>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {importGroups.map((importGroup) => (
          <ActivityGroup
            key={importGroup.importId}
            title={importGroup.title}
            overallStatus={importGroup.overallStatus}
            operations={importGroup.operations}
          />
        ))}
      </div>
    </div>
  );
}

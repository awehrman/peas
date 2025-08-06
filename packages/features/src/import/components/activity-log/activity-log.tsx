"use client";

import { ActivityGroup } from "./activity-group";
import { ConnectionStatus } from "./connection-status";

import { ReactNode, useCallback, useMemo } from "react";

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

  // Memoize the event processing logic
  const processedEvents = useMemo(() => {
    // Track completed saved IDs by import ID and type
    const completedInstructionIds = new Map<string, Set<string>>();
    const completedIngredientIds = new Map<string, Set<string>>();

    // Track total counts by import ID (from initial events)
    const instructionTotals = new Map<string, number>();
    const ingredientTotals = new Map<string, number>();

    // Track initial event timestamps by import ID
    const instructionInitialTimestamps = new Map<string, Date>();
    const ingredientInitialTimestamps = new Map<string, Date>();

    // Track which imports we've seen initial events for
    const seenInitialEvents = new Set<string>();

    // Process events to track instruction and ingredient progress
    events.forEach((event) => {
      console.log(`[ActivityLog] Processing event:`, {
        context: event.context,
        importId: event.importId,
        noteId: event.noteId,
        metadata: event.metadata,
        message: event.message,
      });

      // Handle instruction processing updates
      if (
        event.context === "instruction_processing" &&
        event.importId &&
        event.metadata
      ) {
        const savedId = event.metadata.savedInstructionId as string;
        const total = event.metadata.totalInstructions as number;

        console.log(`[ActivityLog] Instruction event details:`, {
          importId: event.importId,
          savedId,
          total,
          totalType: typeof total,
          hasSavedId: typeof savedId === "string",
        });

        // Handle initial event (has total, no savedId)
        if (typeof total === "number" && typeof savedId !== "string") {
          instructionTotals.set(event.importId, total);
          instructionInitialTimestamps.set(
            event.importId,
            new Date(event.createdAt)
          );
          console.log(
            `[ActivityLog] Set instruction total: ${total} for import ${event.importId}`
          );

          // Mark that we've seen an initial event for this import
          const eventKey = `${event.importId}-instructions`;
          seenInitialEvents.add(eventKey);
        }

        // Handle completion event (has savedId, may or may not have total)
        if (typeof savedId === "string") {
          // Initialize tracking if needed
          if (!completedInstructionIds.has(event.importId)) {
            completedInstructionIds.set(event.importId, new Set());
          }
          const completedIds = completedInstructionIds.get(event.importId)!;
          completedIds.add(savedId);

          console.log(
            `[ActivityLog] Instruction completed: savedId=${savedId}, completedIds=${Array.from(completedIds).join(",")} for import ${event.importId}`
          );
        }
      }

      // Handle ingredient processing updates
      if (
        event.context === "ingredient_processing" &&
        event.importId &&
        event.metadata
      ) {
        const savedId = event.metadata.savedIngredientId as string;
        const total = event.metadata.totalIngredients as number;

        console.log(`[ActivityLog] Ingredient event details:`, {
          importId: event.importId,
          savedId,
          total,
          totalType: typeof total,
          hasSavedId: typeof savedId === "string",
        });

        // Handle initial event (has total, no savedId)
        if (typeof total === "number" && typeof savedId !== "string") {
          ingredientTotals.set(event.importId, total);
          ingredientInitialTimestamps.set(
            event.importId,
            new Date(event.createdAt)
          );
          console.log(
            `[ActivityLog] Set ingredient total: ${total} for import ${event.importId}`
          );

          // Mark that we've seen an initial event for this import
          const eventKey = `${event.importId}-ingredients`;
          seenInitialEvents.add(eventKey);
        }

        // Handle completion event (has savedId, may or may not have total)
        if (typeof savedId === "string") {
          // Initialize tracking if needed
          if (!completedIngredientIds.has(event.importId)) {
            completedIngredientIds.set(event.importId, new Set());
          }
          const completedIds = completedIngredientIds.get(event.importId)!;
          completedIds.add(savedId);

          console.log(
            `[ActivityLog] Ingredient completed: savedId=${savedId}, completedIds=${Array.from(completedIds).join(",")} for import ${event.importId}`
          );
        }
      }

      // Handle note completion events
      if (
        event.context === "note_completion" &&
        event.importId &&
        event.status === "COMPLETED"
      ) {
        console.log(`[ActivityLog] Note completion event:`, {
          importId: event.importId,
          noteId: event.noteId,
          message: event.message,
        });
      }
    });

    // Calculate final counts
    const instructionCounts = new Map<
      string,
      { processed: number; total: number; timestamp: Date }
    >();
    const ingredientCounts = new Map<
      string,
      { processed: number; total: number; timestamp: Date }
    >();

    // Process instruction counts - include both completed and initial states
    const allInstructionImports = new Set([
      ...instructionTotals.keys(),
      ...completedInstructionIds.keys(),
    ]);

    allInstructionImports.forEach((importId) => {
      const total = instructionTotals.get(importId) || 0;
      const completedIds = completedInstructionIds.get(importId);
      const processed = completedIds ? completedIds.size : 0;

      // Use the initial event timestamp so progress updates stay in position
      const initialTimestamp = instructionInitialTimestamps.get(importId);

      if (initialTimestamp) {
        instructionCounts.set(importId, {
          processed,
          total,
          timestamp: initialTimestamp,
        });
      }
    });

    // Process ingredient counts - include both completed and initial states
    const allIngredientImports = new Set([
      ...ingredientTotals.keys(),
      ...completedIngredientIds.keys(),
    ]);

    allIngredientImports.forEach((importId) => {
      const total = ingredientTotals.get(importId) || 0;
      const completedIds = completedIngredientIds.get(importId);
      const processed = completedIds ? completedIds.size : 0;

      // Use the initial event timestamp so progress updates stay in position
      const initialTimestamp = ingredientInitialTimestamps.get(importId);

      if (initialTimestamp) {
        ingredientCounts.set(importId, {
          processed,
          total,
          timestamp: initialTimestamp,
        });
      }
    });

    // Log what we've seen
    console.log(
      `[ActivityLog] Seen initial events:`,
      Array.from(seenInitialEvents)
    );
    console.log(`[ActivityLog] Final counts:`, {
      instructionCounts: Object.fromEntries(instructionCounts),
      ingredientCounts: Object.fromEntries(ingredientCounts),
    });

    return {
      instructionCounts,
      ingredientCounts,
    };
  }, [events]);

  // Memoize the filtering logic
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
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

      // Hide instruction_processing events since we're updating the parse_html_instructions message
      if (event.context === "instruction_processing") return false;

      // Hide ingredient_processing events since we're updating the parse_html_ingredients message
      if (event.context === "ingredient_processing") return false;

      return true;
    });
  }, [events]);

  // Memoize the items conversion
  const items: Item[] = useMemo(() => {
    const baseItems = filteredEvents.map((event) => {
      const text =
        event.errorMessage ||
        event.message ||
        event.context ||
        `Status ${event.status}`;

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

    // Add display events for instruction and ingredient progress
    const displayItems: Item[] = [];

    // Create instruction progress display events
    processedEvents.instructionCounts.forEach((countData, importId) => {
      displayItems.push({
        id: `${importId}-instructions-progress-${countData.processed}`,
        text: `${countData.processed}/${countData.total} instructions`,
        indentLevel: 2,
        importId,
        timestamp: countData.timestamp, // Use actual event timestamp
        metadata: {},
        context: "parse_html_instructions",
      });
    });

    // Create ingredient progress display events
    processedEvents.ingredientCounts.forEach((countData, importId) => {
      displayItems.push({
        id: `${importId}-ingredients-progress-${countData.processed}`,
        text: `${countData.processed}/${countData.total} ingredients`,
        indentLevel: 2,
        importId,
        timestamp: countData.timestamp, // Use actual event timestamp
        metadata: {},
        context: "parse_html_ingredients",
      });
    });

    // Combine and sort by timestamp
    return [...baseItems, ...displayItems].sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;

      // If timestamps are the same, prioritize ingredients over instructions
      if (timeA === timeB) {
        const isIngredientA = a.context === "parse_html_ingredients";
        const isIngredientB = b.context === "parse_html_ingredients";
        const isInstructionA = a.context === "parse_html_instructions";
        const isInstructionB = b.context === "parse_html_instructions";

        // Ingredients come before instructions
        if (isIngredientA && isInstructionB) return -1;
        if (isInstructionA && isIngredientB) return 1;
      }

      return timeA - timeB;
    });
  }, [filteredEvents, processedEvents]);

  // Memoize the import groups
  const importGroups = useMemo(() => {
    return groupStatusItemsByImport(items);
  }, [items]);

  // Memoize the debug logging to prevent unnecessary console calls
  const debugLog = useCallback(() => {
    console.log(
      `[ActivityLog] Received ${events.length} events:`,
      events.map((e) => ({
        context: e.context,
        message: e.message,
        importId: e.importId,
      }))
    );
  }, [events]);

  // Only log in development
  if (process.env.NODE_ENV === "development") {
    debugLog();
  }

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

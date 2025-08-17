import { StatusEvent } from "./use-status-websocket";

import { useCallback, useEffect, useState } from "react";

import { ImportItem } from "../components/activity-log/types";

interface UseImportItemsOptions {
  events: StatusEvent[];
}

export function useImportItems({ events }: UseImportItemsOptions) {
  const [items, setItems] = useState<Map<string, ImportItem>>(new Map());

  // Memoized event filtering function
  const shouldSkipEvent = useCallback((event: StatusEvent): boolean => {
    return (
      event.context === "wait_for_categorization_complete" &&
      !!event.message?.includes("Categorization timeout - continuing anyway")
    );
  }, []);

  // Memoized event sorting function
  const sortEventsByTimestamp = useCallback(
    (events: StatusEvent[]): StatusEvent[] => {
      return [...events].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });
    },
    []
  );

  // Update items when events change
  useEffect(() => {
    setItems((currentItems) => {
      const newItems = new Map(currentItems);
      const sortedEvents = sortEventsByTimestamp(events);

      for (const event of sortedEvents) {
        const importId = event.importId;

        console.log("📊 [USE_IMPORT_ITEMS] Processing event:", {
          importId,
          context: event.context,
          status: event.status,
          metadata: event.metadata,
        });

        // Skip certain events that shouldn't affect the display
        if (shouldSkipEvent(event)) {
          continue; // Don't mark as failed for categorization timeout
        }

        if (!newItems.has(importId)) {
          // Create new import item
          newItems.set(importId, {
            importId,
            htmlFileName: "", // Will be filled from upload or events
            noteTitle: event.metadata?.noteTitle as string,
            status: "importing",
            createdAt: new Date(event.createdAt),
          });
        }

        const item = newItems.get(importId)!;

        // Try to get filename from event metadata (only set once)
        if (event.metadata?.htmlFileName && !item.htmlFileName) {
          item.htmlFileName = event.metadata.htmlFileName as string;
          console.log("📊 [USE_IMPORT_ITEMS] Set htmlFileName:", {
            importId,
            htmlFileName: item.htmlFileName,
            context: event.context,
          });
        }

        // Update note title if available (preserve existing title, only set if we don't have one)
        if (event.metadata?.noteTitle && !item.noteTitle) {
          item.noteTitle = event.metadata.noteTitle as string;
          console.log("📊 [USE_IMPORT_ITEMS] Set noteTitle:", {
            importId,
            noteTitle: item.noteTitle,
            context: event.context,
          });
        }

        // Check for completion events
        if (
          event.status === "COMPLETED" &&
          event.context === "note_completion"
        ) {
          item.status = "completed";
          item.completedAt = new Date(event.createdAt);
        }

        // Check for failure events (but skip categorization timeouts)
        if (
          event.status === "FAILED" &&
          !event.message?.includes("Categorization timeout - continuing anyway")
        ) {
          item.status = "failed";
          item.completedAt = new Date(event.createdAt);
        }
      }

      // Mark stuck import items as failed (stuck in "importing" for more than 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      for (const [importId, item] of newItems.entries()) {
        if (item.status === "importing" && item.createdAt < tenMinutesAgo) {
          console.warn(
            "🚨 [USE_IMPORT_ITEMS] Marking stuck import as failed:",
            {
              importId,
              htmlFileName: item.htmlFileName,
              noteTitle: item.noteTitle,
              createdAt: item.createdAt,
            }
          );
          item.status = "failed";
          item.completedAt = new Date();
        }
      }

      return newItems;
    });
  }, [events, shouldSkipEvent, sortEventsByTimestamp]);

  // Return sorted items
  return Array.from(items.values()).sort((a, b) => {
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

import { type PaginationState, usePagination } from "./use-pagination";
import { StatusEvent } from "./use-status-websocket";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ImportItem } from "../components/activity-log/types";

interface UseImportItemsOptions {
  events: StatusEvent[];
  enablePagination?: boolean;
  itemsPerPage?: number;
}

export interface UseImportItemsReturn {
  allItems: ImportItem[];
  paginatedItems: ImportItem[];
  pagination: PaginationState | null;
}

export function useImportItems({
  events,
  enablePagination = false,
  itemsPerPage = 10,
}: UseImportItemsOptions): UseImportItemsReturn {
  const [items, setItems] = useState<Map<string, ImportItem>>(new Map());

  // Memory management constants
  const MAX_ITEMS = 100;
  const CLEANUP_THRESHOLD = 50;

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
        }

        // Update note title if available (preserve existing title, only set if we don't have one)
        if (event.metadata?.noteTitle && !item.noteTitle) {
          item.noteTitle = event.metadata.noteTitle as string;
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

  // Memory cleanup effect - remove old items when we exceed the limit
  useEffect(() => {
    if (items.size > MAX_ITEMS) {
      setItems((currentItems) => {
        // Sort items by creation date (newest first) and keep only the most recent ones
        const sortedItems = Array.from(currentItems.entries())
          .sort(([, a], [, b]) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, CLEANUP_THRESHOLD);
        
        return new Map(sortedItems);
      });
    }
  }, [items.size]);

  // Get all items in stable insertion order (freeze initial ordering)
  const allItems = useMemo(() => {
    // Map preserves insertion order; values() reflects the order in which items were first set
    return Array.from(items.values());
  }, [items]);

  // Use pagination if enabled
  const pagination = usePagination({
    totalItems: allItems.length,
    defaultLimit: itemsPerPage,
  });

  // Return both all items and paginated items
  return {
    allItems,
    paginatedItems: enablePagination
      ? allItems.slice(pagination.startIndex, pagination.endIndex)
      : allItems,
    pagination: enablePagination ? pagination : null,
  };
}

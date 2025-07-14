"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  Item,
  groupStatusItems,
  getStatusColor,
  getStatusIcon,
} from "../utils";
import {
  getInitialNoteStatusEvents,
  getIncrementalNoteStatusEvents,
} from "../actions";

interface Props {
  className?: string;
}

export function RecentlyImported({ className }: Props): ReactNode {
  console.log("🔍 Component: RecentlyImported component rendered");

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastPollTime, setLastPollTime] = useState<number>(Date.now());

  // Debug: Log when new events are created
  useEffect(() => {
    console.log("🔍 Component: Items updated", {
      itemCount: items.length,
      lastEventId,
      lastPollTime: new Date(lastPollTime).toISOString(),
    });
  }, [items, lastEventId, lastPollTime]);

  const fetchInitialData = async () => {
    console.log("🔄 Component: Starting initial data fetch");
    try {
      const result = await getInitialNoteStatusEvents();
      console.log("✅ Component: Initial data received", {
        itemCount: result?.items?.length ?? 0,
        lastEventId: result.lastEventId,
        items: result.items.map((item) => ({ id: item.id, text: item.text })),
      });
      setItems(result.items);
      setLastEventId(result.lastEventId || null);
    } catch (error) {
      console.error(
        "❌ Component: Failed to fetch initial status events:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Listen for file upload events and refresh data
  useEffect(() => {
    const handleFileUploaded = () => {
      console.log("🔍 Component: File uploaded, refreshing data");
      setLoading(true);
      fetchInitialData();
    };

    window.addEventListener("fileUploaded", handleFileUploaded);

    return () => {
      window.removeEventListener("fileUploaded", handleFileUploaded);
    };
  }, []);

  // Poll for updates every 2 seconds
  useEffect(() => {
    console.log("🔍 Component: Polling effect triggered", {
      lastEventId,
      itemsCount: items.length,
    });

    if (!lastEventId) {
      console.log("🔍 Component: No lastEventId, skipping polling");
      return;
    }

    console.log("🔍 Component: Starting polling interval");
    const interval = setInterval(async () => {
      console.log("🔄 Component: Polling for updates", { lastEventId });
      try {
        const result = await getIncrementalNoteStatusEvents(
          lastEventId,
          lastPollTime
        );

        if (result.items.length > 0) {
          console.log("✅ Component: New items received", {
            newItemCount: result.items.length,
          });
          // Add new items that aren't already in the list
          setItems((prev) => {
            const newItems = result.items.filter(
              (newItem) => !prev.some((existing) => existing.id === newItem.id)
            );
            return [...prev, ...newItems].slice(-25); // Keep last 25 items
          });
        } else {
          console.log("🔍 Component: No new items in this poll");
        }

        if (result.lastEventId) {
          console.log("🔍 Component: Updating lastEventId", {
            old: lastEventId,
            new: result.lastEventId,
          });
          setLastEventId(result.lastEventId);
        }

        // Update the last poll time
        setLastPollTime(Date.now());
      } catch (error) {
        console.error(
          "❌ Component: Failed to fetch incremental status events:",
          error
        );
      }
    }, 2000);

    return () => {
      console.log("🔍 Component: Cleaning up polling interval");
      clearInterval(interval);
    };
  }, [lastEventId]);

  // Group items by operation type and organize them hierarchically
  const groupedItems = groupStatusItems(items);

  console.log("🔍 Component: Render check", {
    loading,
    itemsCount: items.length,
    groupedItemsCount: groupedItems.length,
  });

  if (loading || groupedItems.length === 0) {
    console.log("🔍 Component: Not rendering - loading or no items");
    return null;
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recently Imported
      </h3>
      <div className="space-y-3">
        {groupedItems.map((group) => (
          <div key={group.id} className="border-l-2 border-gray-200 pl-4">
            <div
              className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(group.status)}`}
            >
              <span>{getStatusIcon(group.status)}</span>
              <span>{group.title}</span>
            </div>

            {group.children.length > 0 && (
              <div className="mt-2 ml-6 space-y-1">
                {group.children.map((child) => (
                  <div
                    key={child.id}
                    className="text-sm text-gray-600"
                    style={{
                      paddingLeft: child.indentLevel * 8,
                    }}
                  >
                    {child.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

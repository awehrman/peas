"use client";

import { useEffect, useState } from "react";
import { Placeholder } from "@peas/ui";

interface Item {
  text: string;
  indentLevel: number;
  id: string;
}

interface Props {
  className?: string;
}

export function RecentlyImported({ className }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const fetchStatusEvents = async (since?: string) => {
    try {
      const url = since
        ? `/api/import/status?since=${since}`
        : "/api/import/status";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();

        if (since && data.items.length > 0) {
          // Incremental update - only add new items that aren't already in the list
          setItems((prev) => {
            const newItems = data.items.filter(
              (newItem: Item) =>
                !prev.some((existing) => existing.id === newItem.id)
            );
            return [...prev, ...newItems].slice(-25); // Keep last 25 items
          });
        } else {
          // Full refresh
          setItems(data.items);
        }

        setLastEventId(data.lastEventId);
      }
    } catch (error) {
      console.error("Failed to fetch status events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Consolidate progress updates - keep only the latest for each context
  const consolidatedItems = items.reduce((acc: Item[], item: Item) => {
    // If this is a progress update (contains percentage), check if we already have a newer one
    if (item.text.includes("%") && item.text.includes("ingredient lines")) {
      const existingIndex = acc.findIndex(
        (existing) =>
          existing.text.includes("%") &&
          existing.text.includes("ingredient lines") &&
          existing.indentLevel === item.indentLevel
      );

      if (existingIndex !== -1) {
        // Replace the older progress update with the newer one
        acc[existingIndex] = item;
        return acc;
      }
    }

    acc.push(item);
    return acc;
  }, []);

  useEffect(() => {
    fetchStatusEvents();

    // Poll every 2 seconds, using incremental updates when possible
    const interval = setInterval(() => {
      fetchStatusEvents(lastEventId ?? undefined);
    }, 2000);

    return () => clearInterval(interval);
  }, [lastEventId]);

  if (loading || consolidatedItems.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recently Imported
      </h3>
      <div className="space-y-2">
        {consolidatedItems.map((item) => (
          <div
            key={item.id}
            className="text-sm text-gray-600"
            style={{
              paddingLeft:
                item.indentLevel === 0 ? 0 : item.indentLevel === 1 ? 16 : 32,
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

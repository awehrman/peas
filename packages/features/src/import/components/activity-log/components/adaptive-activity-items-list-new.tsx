"use client";

import { ActivityItemsList } from "./activity-items-list";

import { ReactNode, memo, useEffect, useRef, useState } from "react";

import { VirtualizedList } from "../../../features/virtualized-list";
import { StatusEvent } from "../../../hooks/use-status-websocket";
import { ActivityItem } from "../../../types/core";
import { CollapsibleImportItem } from "../collapsible-import-item";
import { ImportItemComponent } from "../import-item";

interface AdaptiveActivityItemsListProps {
  items: ActivityItem[];
  eventsByImportId: Map<string, StatusEvent[]>;
  fileTitles: Map<string, string>;
  showCollapsible: boolean;
  isExpanded: (itemId: string) => boolean;
  onToggle: (itemId: string) => void;
  className?: string;
  virtualizationThreshold?: number; // Number of items before switching to virtualization
  defaultItemHeight?: number; // Default height for virtualized items
}

const AdaptiveActivityItemsListComponent = ({
  items,
  eventsByImportId,
  fileTitles,
  showCollapsible,
  isExpanded,
  onToggle,
  className = "",
  virtualizationThreshold = 50,
  defaultItemHeight = 80,
}: AdaptiveActivityItemsListProps): ReactNode => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600); // Default height

  // Calculate dynamic height based on content and expansion state
  useEffect(() => {
    if (containerRef.current) {
      const updateHeight = () => {
        if (containerRef.current) {
          // Calculate height based on items and their expansion state
          const collapsedHeight = 80; // Height of collapsed items
          const expandedHeight = 650; // Height of expanded items

          // Count expanded and collapsed items
          const expandedCount = items.filter(
            (item) =>
              showCollapsible &&
              item.type === "import" &&
              isExpanded(item.importId)
          ).length;
          const collapsedCount = items.length - expandedCount;

          // Calculate total content height
          const contentHeight =
            collapsedCount * collapsedHeight + expandedCount * expandedHeight;

          // Add some padding and ensure minimum height
          const minHeight = Math.max(
            400,
            collapsedHeight * Math.min(items.length, 3)
          );
          const calculatedHeight = Math.max(minHeight, contentHeight + 100);

          // Cap at a reasonable maximum to prevent excessive height
          const maxHeight = Math.min(calculatedHeight, 1200);

          setContainerHeight(maxHeight);
        }
      };

      updateHeight();
      window.addEventListener("resize", updateHeight);

      return () => window.removeEventListener("resize", updateHeight);
    }
  }, [items, showCollapsible, isExpanded]);

  // Render function for virtualized list
  const renderItem = (
    item: ActivityItem,
    _index: number
  ): React.ReactElement => {
    const handleToggle = () => {
      onToggle(item.importId);
    };

    return (
      <div className="px-2 py-1 pb-4">
        {showCollapsible && item.type === "import" ? (
          <CollapsibleImportItem
            item={item}
            fileTitles={fileTitles}
            events={eventsByImportId.get(item.importId) || []}
            isExpanded={isExpanded(item.importId)}
            onToggle={handleToggle}
          />
        ) : (
          <ImportItemComponent item={item} fileTitles={fileTitles} />
        )}
      </div>
    );
  };

  // Only use virtualization for large lists or when content height exceeds container
  const forceVirtualization = items.length > virtualizationThreshold;
  const contentHeight = items.length * defaultItemHeight;
  const shouldUseVirtualization = contentHeight > containerHeight * 1.5; // Only virtualize if content is significantly larger
  const useVirtualization = shouldUseVirtualization || forceVirtualization;

  // Check if we should show empty state
  const hasNoItems = items.length === 0;

  // Early return after all hooks
  if (hasNoItems) {
    return (
      <div
        className={`flex items-center justify-center py-8 text-gray-500 ${className}`}
      >
        No items to display
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {useVirtualization ? (
        <VirtualizedList
          items={items}
          itemHeight={defaultItemHeight}
          containerHeight={containerHeight}
          overscan={5}
          renderItem={renderItem}
          className="activity-items-virtualized"
        />
      ) : (
        <ActivityItemsList
          items={items}
          eventsByImportId={eventsByImportId}
          fileTitles={fileTitles}
          showCollapsible={showCollapsible}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const AdaptiveActivityItemsListNew = memo(
  AdaptiveActivityItemsListComponent
);

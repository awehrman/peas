"use client";

import { ActivityItemsList } from "./activity-items-list";
import { VirtualizedActivityItemsList } from "./virtualized-activity-items-list";

import { ReactNode, memo, useEffect, useRef, useState } from "react";

import { useDynamicVirtualization } from "../../../hooks/use-dynamic-virtualization";
import { StatusEvent } from "../../../hooks/use-status-websocket";
import { ActivityItem } from "../../../types/core";

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
          const expandedCount = items.filter(item => 
            showCollapsible && item.type === "import" && isExpanded(item.importId)
          ).length;
          const collapsedCount = items.length - expandedCount;
          
          // Calculate total content height
          const contentHeight = (collapsedCount * collapsedHeight) + (expandedCount * expandedHeight);
          
          // Add some padding and ensure minimum height
          const minHeight = Math.max(400, collapsedHeight * Math.min(items.length, 3));
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

  // Use dynamic virtualization hook
  const { shouldVirtualize, getEstimatedItemHeight, metrics } =
    useDynamicVirtualization(items, {
      defaultItemHeight,
      containerHeight,
      overscanCount: 5,
      enableDynamicHeight: true,
    });

  // Only use virtualization for large lists or when content height exceeds container
  const forceVirtualization = items.length > virtualizationThreshold;
  const contentHeight = items.length * defaultItemHeight;
  const shouldUseVirtualization = contentHeight > containerHeight * 1.5; // Only virtualize if content is significantly larger
  const useVirtualization = shouldUseVirtualization || forceVirtualization;

  // Performance monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("📊 [ActivityList] Performance Metrics:", {
        itemCount: metrics.totalItems,
        shouldVirtualize: useVirtualization,
        reason: forceVirtualization ? "threshold exceeded" : shouldUseVirtualization ? "content height" : "standard rendering",
        estimatedHeight: metrics.estimatedTotalHeight,
        containerHeight,
        contentHeight,
        averageItemHeight: metrics.averageItemHeight,
      });
    }
  }, [metrics, useVirtualization, forceVirtualization, shouldUseVirtualization, containerHeight, contentHeight]);

  if (items.length === 0) {
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
        <VirtualizedActivityItemsList
          items={items}
          eventsByImportId={eventsByImportId}
          fileTitles={fileTitles}
          showCollapsible={showCollapsible}
          isExpanded={isExpanded}
          onToggle={onToggle}
          height={containerHeight}
          itemHeight={defaultItemHeight}
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
export const AdaptiveActivityItemsList = memo(
  AdaptiveActivityItemsListComponent
);

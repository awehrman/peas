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

  // Measure container height
  useEffect(() => {
    if (containerRef.current) {
      const updateHeight = () => {
        if (containerRef.current) {
          // Use parent height or viewport height minus some padding
          const parentHeight = containerRef.current.parentElement?.clientHeight;
          const viewportHeight = window.innerHeight;
          const maxHeight = Math.min(parentHeight || viewportHeight * 0.6, 800);
          setContainerHeight(maxHeight);
        }
      };

      updateHeight();
      window.addEventListener("resize", updateHeight);

      return () => window.removeEventListener("resize", updateHeight);
    }
  }, []);

  // Use dynamic virtualization hook
  const { shouldVirtualize, getEstimatedItemHeight, metrics } =
    useDynamicVirtualization(items, {
      defaultItemHeight,
      containerHeight,
      overscanCount: 5,
      enableDynamicHeight: true,
    });

  // Force virtualization if we exceed the threshold
  const forceVirtualization = items.length > virtualizationThreshold;
  const useVirtualization = shouldVirtualize || forceVirtualization;

  // Performance monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("📊 [ActivityList] Performance Metrics:", {
        itemCount: metrics.totalItems,
        shouldVirtualize: useVirtualization,
        reason: forceVirtualization ? "threshold exceeded" : "estimated height",
        estimatedHeight: metrics.estimatedTotalHeight,
        containerHeight,
        averageItemHeight: metrics.averageItemHeight,
      });
    }
  }, [metrics, useVirtualization, forceVirtualization, containerHeight]);

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
        <div>


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
        </div>
      ) : (
        <div>


          <ActivityItemsList
            items={items}
            eventsByImportId={eventsByImportId}
            fileTitles={fileTitles}
            showCollapsible={showCollapsible}
            isExpanded={isExpanded}
            onToggle={onToggle}
          />
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const AdaptiveActivityItemsList = memo(
  AdaptiveActivityItemsListComponent
);

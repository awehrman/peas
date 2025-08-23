"use client";

import { useCallback, useMemo, useRef } from "react";

import { ActivityItem } from "../types/core";

interface VirtualizationConfig {
  defaultItemHeight: number;
  containerHeight: number;
  overscanCount?: number;
  enableDynamicHeight?: boolean;
}

interface ItemHeightCache {
  [key: string]: number;
}

export function useDynamicVirtualization(
  items: ActivityItem[],
  config: VirtualizationConfig
) {
  const {
    defaultItemHeight,
    containerHeight,
    overscanCount = 5,
    enableDynamicHeight = false,
  } = config;

  const heightCacheRef = useRef<ItemHeightCache>({});

  // Calculate estimated item height based on item type and content
  const getEstimatedItemHeight = useCallback(
    (item: ActivityItem): number => {
      const baseHeight = defaultItemHeight;

      if (!enableDynamicHeight) {
        return baseHeight;
      }

      // Check if we have a cached height
      const cachedHeight = heightCacheRef.current[item.importId];
      if (cachedHeight) {
        return cachedHeight;
      }

      // Estimate height based on item properties
      let estimatedHeight = baseHeight;

      // Add height for collapsible items
      if ("noteTitle" in item && item.type === "import") {
        estimatedHeight += 40; // Extra height for collapsible header
      }

      // Add height for items with long titles
      if ("noteTitle" in item && item.noteTitle && item.noteTitle.length > 50) {
        estimatedHeight += 20; // Extra height for wrapped text
      }

      // Add height for upload items with progress
      if ("batchProgress" in item && item.batchProgress) {
        estimatedHeight += 30; // Extra height for progress bar
      }

      return estimatedHeight;
    },
    [defaultItemHeight, enableDynamicHeight]
  );

  // Update height cache when item is measured
  const updateItemHeight = useCallback((importId: string, height: number) => {
    heightCacheRef.current[importId] = height;
  }, []);

  // Calculate total estimated height for all items
  const totalEstimatedHeight = useMemo(() => {
    return items.reduce((total, item) => {
      return total + getEstimatedItemHeight(item);
    }, 0);
  }, [items, getEstimatedItemHeight]);

  // Determine if virtualization should be enabled
  const shouldVirtualize = useMemo(() => {
    // Always virtualize if we have more than 50 items
    if (items.length > 50) return true;

    // Virtualize if estimated total height exceeds container height by 50%
    if (totalEstimatedHeight > containerHeight * 1.5) return true;

    return false;
  }, [items.length, totalEstimatedHeight, containerHeight]);

  // Calculate visible range for manual virtualization if needed
  const getVisibleRange = useCallback(
    (scrollTop: number, containerHeight: number) => {
      let currentHeight = 0;
      let startIndex = 0;
      let endIndex = items.length - 1;

      // Find start index
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) break;
        const itemHeight = getEstimatedItemHeight(item);
        if (currentHeight + itemHeight > scrollTop) {
          startIndex = Math.max(0, i - overscanCount);
          break;
        }
        currentHeight += itemHeight;
      }

      // Find end index
      currentHeight = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) break;
        const itemHeight = getEstimatedItemHeight(item);
        currentHeight += itemHeight;
        if (currentHeight > scrollTop + containerHeight) {
          endIndex = Math.min(items.length - 1, i + overscanCount);
          break;
        }
      }

      return { startIndex, endIndex };
    },
    [items, getEstimatedItemHeight, overscanCount]
  );

  // Performance metrics
  const metrics = useMemo(
    () => ({
      totalItems: items.length,
      shouldVirtualize,
      estimatedTotalHeight: totalEstimatedHeight,
      averageItemHeight:
        totalEstimatedHeight / items.length || defaultItemHeight,
      cacheSize: Object.keys(heightCacheRef.current).length,
    }),
    [items.length, shouldVirtualize, totalEstimatedHeight, defaultItemHeight]
  );

  return {
    shouldVirtualize,
    getEstimatedItemHeight,
    updateItemHeight,
    getVisibleRange,
    totalEstimatedHeight,
    metrics,
  };
}

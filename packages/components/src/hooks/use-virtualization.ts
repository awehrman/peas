"use client";

import { useCallback, useMemo, useRef } from "react";

interface VirtualizationConfig<T> {
  items: T[];
  defaultItemHeight: number;
  containerHeight: number;
  overscanCount?: number;
  enableDynamicHeight?: boolean;
  getItemHeight?: (item: T, index: number) => number;
  getItemKey?: (item: T, index: number) => string;
}

interface ItemHeightCache {
  [key: string]: number;
}

export function useVirtualization<T>(
  config: VirtualizationConfig<T>
) {
  const {
    items,
    defaultItemHeight,
    containerHeight,
    overscanCount = 5,
    enableDynamicHeight = false,
    getItemHeight,
    getItemKey = (item, index) => `item-${index}`,
  } = config;

  const heightCacheRef = useRef<ItemHeightCache>({});

  // Calculate estimated item height
  const getEstimatedItemHeight = useCallback(
    (item: T, index: number): number => {
      const baseHeight = defaultItemHeight;

      if (!enableDynamicHeight) {
        return baseHeight;
      }

      // Use custom height function if provided
      if (getItemHeight) {
        return getItemHeight(item, index);
      }

      // Check if we have a cached height
      const itemKey = getItemKey(item, index);
      const cachedHeight = heightCacheRef.current[itemKey];
      if (cachedHeight) {
        return cachedHeight;
      }

      return baseHeight;
    },
    [defaultItemHeight, enableDynamicHeight, getItemHeight, getItemKey]
  );

  // Update height cache when item is measured
  const updateItemHeight = useCallback((itemKey: string, height: number) => {
    heightCacheRef.current[itemKey] = height;
  }, []);

  // Calculate total estimated height for all items
  const totalEstimatedHeight = useMemo(() => {
    return items.reduce((total, item, index) => {
      return total + getEstimatedItemHeight(item, index);
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
        const itemHeight = getEstimatedItemHeight(item, i);
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
        const itemHeight = getEstimatedItemHeight(item, i);
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

  // Get visible items based on scroll position
  const getVisibleItems = useCallback(
    (scrollTop: number, containerHeight: number) => {
      if (!shouldVirtualize) {
        return items;
      }

      const { startIndex, endIndex } = getVisibleRange(scrollTop, containerHeight);
      return items.slice(startIndex, endIndex + 1);
    },
    [items, shouldVirtualize, getVisibleRange]
  );

  // Calculate offset for visible items
  const getItemOffset = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const item = items[i];
        if (item) {
          offset += getEstimatedItemHeight(item, i);
        }
      }
      return offset;
    },
    [items, getEstimatedItemHeight]
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
    getVisibleItems,
    getItemOffset,
    totalEstimatedHeight,
    metrics,
  };
}

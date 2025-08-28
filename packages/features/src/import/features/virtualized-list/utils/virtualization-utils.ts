import { VirtualizationState, UseVirtualizationOptions } from "../types/virtualization";

/**
 * Calculate whether virtualization should be enabled based on threshold
 */
export function shouldVirtualize(
  itemsCount: number,
  threshold: number = 50
): boolean {
  return itemsCount > threshold;
}

/**
 * Calculate virtual items based on scroll position and container dimensions
 */
export function calculateVirtualItems(
  options: UseVirtualizationOptions,
  scrollTop: number = 0,
  containerHeight: number
): {
  virtualItems: Array<{ index: number; offsetTop: number; height: number }>;
  startIndex: number;
  endIndex: number;
  totalHeight: number;
} {
  const { itemsCount, itemHeight, overscan = 5 } = options;
  
  const totalHeight = itemsCount * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemsCount - 1,
    Math.floor(scrollTop / itemHeight) + visibleCount + overscan
  );
  
  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      offsetTop: i * itemHeight,
      height: itemHeight,
    });
  }
  
  return {
    virtualItems,
    startIndex,
    endIndex,
    totalHeight,
  };
}

/**
 * Calculate virtualization state
 */
export function calculateVirtualizationState(
  options: UseVirtualizationOptions,
  scrollTop: number = 0,
  containerHeight: number
): VirtualizationState {
  const { itemsCount, itemHeight, threshold = 50 } = options;
  
  const isVirtualized = shouldVirtualize(itemsCount, threshold);
  
  if (!isVirtualized) {
    return {
      startIndex: 0,
      endIndex: itemsCount - 1,
      visibleItems: Array.from({ length: itemsCount }, (_, i) => i),
      totalHeight: itemsCount * itemHeight,
      scrollTop,
      containerHeight,
      isVirtualized: false,
    };
  }
  
  const { virtualItems, startIndex, endIndex, totalHeight } = calculateVirtualItems(
    options,
    scrollTop,
    containerHeight
  );
  
  return {
    startIndex,
    endIndex,
    visibleItems: virtualItems.map(item => item.index),
    totalHeight,
    scrollTop,
    containerHeight,
    isVirtualized: true,
  };
}

/**
 * Get visible items from a list based on virtualization state
 */
export function getVisibleItems<T>(
  items: T[],
  state: VirtualizationState
): T[] {
  if (!state.isVirtualized) {
    return items;
  }
  
  return items.slice(state.startIndex, state.endIndex + 1);
}

/**
 * Calculate optimal overscan based on container height and item height
 */
export function calculateOptimalOverscan(
  containerHeight: number,
  itemHeight: number
): number {
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  return Math.max(5, Math.ceil(visibleItems * 0.5));
}

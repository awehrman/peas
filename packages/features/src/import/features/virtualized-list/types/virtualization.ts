export interface VirtualizationOptions {
  itemHeight: number;
  overscan?: number;
  threshold?: number;
  containerHeight?: number;
}

export interface VirtualizationState {
  startIndex: number;
  endIndex: number;
  visibleItems: number[];
  totalHeight: number;
  scrollTop: number;
  containerHeight: number;
  isVirtualized: boolean;
}

import React from "react";

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactElement;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export interface UseVirtualizationOptions {
  itemsCount: number;
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  threshold?: number;
}

export interface UseVirtualizationReturn extends VirtualizationState {
  virtualItems: Array<{
    index: number;
    offsetTop: number;
    height: number;
  }>;
  totalHeight: number;
  isVirtualized: boolean;
  shouldVirtualize: boolean;
}

export interface VirtualizedListContextValue {
  state: VirtualizationState;
  options: VirtualizationOptions;
  virtualItems: Array<{
    index: number;
    offsetTop: number;
    height: number;
  }>;
}

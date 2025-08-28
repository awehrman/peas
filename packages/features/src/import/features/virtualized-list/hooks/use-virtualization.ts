import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  UseVirtualizationOptions,
  UseVirtualizationReturn,
} from "../types/virtualization";
import {
  calculateOptimalOverscan,
  calculateVirtualizationState,
  shouldVirtualize,
} from "../utils/virtualization-utils";

export function useVirtualization(
  options: UseVirtualizationOptions
): UseVirtualizationReturn {
  const {
    itemsCount,
    itemHeight,
    containerHeight: initialContainerHeight,
    overscan: initialOverscan = 5,
    threshold = 50,
  } = options;

  const [scrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    initialContainerHeight || 0
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate optimal overscan if not provided
  const overscan = useMemo(() => {
    if (initialOverscan) return initialOverscan;
    if (!containerHeight) return 5;
    return calculateOptimalOverscan(containerHeight, itemHeight);
  }, [initialOverscan, containerHeight, itemHeight]);

  // Determine if virtualization should be used
  const shouldUseVirtualization = useMemo(() => {
    return shouldVirtualize(itemsCount, threshold);
  }, [itemsCount, threshold]);

  // Calculate virtualization state
  const state = useMemo(() => {
    return calculateVirtualizationState(
      {
        ...options,
        overscan,
      },
      scrollTop,
      containerHeight
    );
  }, [options, overscan, scrollTop, containerHeight]);

  // Calculate virtual items
  const virtualItems = useMemo(() => {
    if (!shouldUseVirtualization) {
      return Array.from({ length: itemsCount }, (_, i) => ({
        index: i,
        offsetTop: i * itemHeight,
        height: itemHeight,
      }));
    }

    const { startIndex, endIndex } = calculateVirtualizationState(
      {
        ...options,
        overscan,
      },
      scrollTop,
      containerHeight
    );

    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
        height: itemHeight,
      });
    }
    return items;
  }, [
    shouldUseVirtualization,
    itemsCount,
    itemHeight,
    options,
    overscan,
    scrollTop,
    containerHeight,
  ]);

  // Handle scroll events
  // const _handleScroll = useCallback((event: any) => {
  //   const newScrollTop = event.currentTarget.scrollTop;
  //   setScrollTop(newScrollTop);
  // }, []);

  // Measure container height
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      setContainerHeight(height);
    }
  }, []);

  // Set up resize observer for container height changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(measureContainer);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [measureContainer]);

  // Initial measurement
  useEffect(() => {
    if (!initialContainerHeight) {
      measureContainer();
    }
  }, [initialContainerHeight, measureContainer]);

  return {
    ...state,
    virtualItems,
    shouldVirtualize: shouldUseVirtualization,
  };
}

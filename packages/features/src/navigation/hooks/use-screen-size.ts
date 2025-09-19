"use client";

import { useEffect, useState } from "react";

import { breakpoints } from "@peas/theme";

interface UseScreenSizeOptions {
  breakpoint?: number;
  debounceMs?: number;
}

interface UseScreenSizeReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  isMounted: boolean; // Track if component is mounted (SSR-safe)
}

/**
 * Hook for detecting screen size changes and providing responsive breakpoint utilities
 * @param options Configuration options for the hook
 * @returns Object with boolean flags for different screen sizes and current dimensions
 */
export function useScreenSize(
  options: UseScreenSizeOptions = {}
): UseScreenSizeReturn {
  const { breakpoint = parseInt(breakpoints.md), debounceMs = 100 } = options;

  // For SSR, we can use a reasonable default based on the breakpoint
  // This helps prevent layout shifts and provides better initial rendering
  const defaultWidth =
    typeof window !== "undefined" ? window.innerWidth : breakpoint + 1;

  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : defaultWidth,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  // Track if we're mounted (client-side)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Skip if not in browser environment
    if (typeof window === "undefined") return;

    // Mark as mounted
    setIsMounted(true);

    let timeoutId: ReturnType<typeof setTimeout>;

    const updateDimensions = () => {
      const newDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setDimensions(newDimensions);
    };

    const handleResize = () => {
      // Debounce resize events for better performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, debounceMs);
    };

    // Set initial dimensions immediately
    updateDimensions();

    // Also check on orientation change (mobile devices)
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(updateDimensions, 100);
    };

    // Add event listeners
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      clearTimeout(timeoutId);
    };
  }, [debounceMs]);

  // Calculate responsive flags using theme breakpoints
  const isMobile = dimensions.width < breakpoint;
  const isTablet =
    dimensions.width >= breakpoint &&
    dimensions.width < parseInt(breakpoints.lg);
  const isDesktop = dimensions.width >= parseInt(breakpoints.lg);

  return {
    isMobile,
    isTablet,
    isDesktop,
    width: dimensions.width,
    height: dimensions.height,
    isMounted,
  };
}

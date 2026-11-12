"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Follows `value`, but passes on at most one change per `intervalMs`, always
 * ending on the latest value. Useful for views fed by a fast event stream.
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastEmittedAt = useRef(0);

  useEffect(() => {
    const wait = lastEmittedAt.current + intervalMs - Date.now();
    if (wait <= 0) {
      lastEmittedAt.current = Date.now();
      setThrottled(value);
      return;
    }

    const timeout = setTimeout(() => {
      lastEmittedAt.current = Date.now();
      setThrottled(value);
    }, wait);
    return () => clearTimeout(timeout);
  }, [value, intervalMs]);

  return throttled;
}

"use client";

import { usePaginationContext } from "../contexts/pagination-context";
import { PaginationSummaryProps } from "../types/pagination";

export function PaginationSummary({
  className = "",
  showRange = true,
  showTotal = true,
}: Omit<PaginationSummaryProps, "totalItems">): React.ReactElement | null {
  const { state } = usePaginationContext();

  // Don't render if no items
  if (state.totalItems === 0) {
    return null;
  }

  const rangeText = showRange
    ? `Showing ${state.startIndex + 1} to ${state.endIndex}`
    : "";

  const totalText = showTotal ? `of ${state.totalItems} items` : "";

  const pageText =
    state.totalPages > 1 ? `(Page ${state.page} of ${state.totalPages})` : "";

  const summaryText = [rangeText, totalText, pageText]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`text-sm text-gray-700 ${className}`}>{summaryText}</div>
  );
}

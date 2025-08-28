"use client";

import { usePaginationContext } from "../contexts/pagination-context";
import { PaginationControlsProps } from "../types/pagination";

export function PaginationControls({
  className = "",
  showPageNumbers = true,
  maxPageNumbers = 5,
}: Omit<PaginationControlsProps, "totalItems">): React.ReactElement | null {
  const { state, actions } = usePaginationContext();

  // Calculate which page numbers to show
  const getVisiblePageNumbers = () => {
    const { page, totalPages } = state;
    const numbers: number[] = [];

    if (totalPages <= maxPageNumbers) {
      // Show all page numbers if total is small
      for (let i = 1; i <= totalPages; i++) {
        numbers.push(i);
      }
    } else {
      // Show a window of page numbers around the current page
      const halfWindow = Math.floor(maxPageNumbers / 2);
      let start = Math.max(1, page - halfWindow);
      const end = Math.min(totalPages, start + maxPageNumbers - 1);

      // Adjust if we're near the end
      if (end === totalPages) {
        start = Math.max(1, end - maxPageNumbers + 1);
      }

      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }
    }

    return numbers;
  };

  const visiblePageNumbers = getVisiblePageNumbers();
  const hasVisiblePages = visiblePageNumbers.length > 0;
  const firstVisible: number = hasVisiblePages ? visiblePageNumbers[0]! : 1;
  const lastVisible: number = hasVisiblePages
    ? visiblePageNumbers[visiblePageNumbers.length - 1]!
    : state.totalPages;

  // Don't render if there's only one page or no items
  if (state.totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Left side - Page info */}
      <div className="text-sm text-gray-700">
        Showing {state.startIndex + 1} to {state.endIndex} of {state.totalItems}{" "}
        items
      </div>

      {/* Right side - Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <button
          onClick={actions.goToPreviousPage}
          disabled={!state.hasPreviousPage}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            state.hasPreviousPage
              ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
          }`}
          aria-label="Go to previous page"
        >
          Previous
        </button>

        {/* Page numbers */}
        {showPageNumbers && (
          <div className="flex items-center space-x-1">
            {/* First page */}
            {hasVisiblePages && firstVisible > 1 && (
              <>
                <button
                  onClick={() => actions.goToPage(1)}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  1
                </button>
                {firstVisible > 2 && (
                  <span className="px-2 text-gray-500">...</span>
                )}
              </>
            )}

            {/* Visible page numbers */}
            {visiblePageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => actions.goToPage(pageNumber)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  pageNumber === state.page
                    ? "text-white bg-blue-600 border border-blue-600"
                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                }`}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={pageNumber === state.page ? "page" : undefined}
              >
                {pageNumber}
              </button>
            ))}

            {/* Last page */}
            {hasVisiblePages && lastVisible < state.totalPages && (
              <>
                {lastVisible < state.totalPages - 1 && (
                  <span className="px-2 text-gray-500">...</span>
                )}
                <button
                  onClick={() => actions.goToPage(state.totalPages)}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {state.totalPages}
                </button>
              </>
            )}
          </div>
        )}

        {/* Next button */}
        <button
          onClick={actions.goToNextPage}
          disabled={!state.hasNextPage}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            state.hasNextPage
              ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
          }`}
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}

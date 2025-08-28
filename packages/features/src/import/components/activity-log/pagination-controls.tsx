"use client";

import { ReactNode } from "react";

import { usePagination } from "../../hooks/use-pagination";

export interface PaginationControlsProps {
  totalItems: number;
  className?: string;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
}

export function PaginationControls({
  totalItems,
  className = "",
  showPageNumbers = true,
  maxPageNumbers = 5,
}: PaginationControlsProps): ReactNode {
  const pagination = usePagination({
    totalItems,
    defaultLimit: 10,
  });

  // Calculate which page numbers to show
  const getVisiblePageNumbers = () => {
    const { page, totalPages } = pagination;
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
    : pagination.totalPages;

  // Don't render if there's only one page or no items
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Left side - Page info */}
      <div className="text-sm text-gray-700">
        Showing {pagination.startIndex + 1} to {pagination.endIndex} of{" "}
        {pagination.totalItems} items
      </div>

      {/* Right side - Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <button
          onClick={pagination.goToPreviousPage}
          disabled={!pagination.hasPreviousPage}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            pagination.hasPreviousPage
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
                  onClick={() => pagination.goToPage(1)}
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
                onClick={() => pagination.goToPage(pageNumber)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  pageNumber === pagination.page
                    ? "text-white bg-blue-600 border border-blue-600"
                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                }`}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={
                  pageNumber === pagination.page ? "page" : undefined
                }
              >
                {pageNumber}
              </button>
            ))}

            {/* Last page */}
            {hasVisiblePages && lastVisible < pagination.totalPages && (
              <>
                {lastVisible < pagination.totalPages - 1 && (
                  <span className="px-2 text-gray-500">...</span>
                )}
                <button
                  onClick={() => pagination.goToPage(pagination.totalPages)}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
          </div>
        )}

        {/* Next button */}
        <button
          onClick={pagination.goToNextPage}
          disabled={!pagination.hasNextPage}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            pagination.hasNextPage
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

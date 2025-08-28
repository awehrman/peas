import { PaginationState } from "../types/pagination";

/**
 * Calculate the slice of items for the current page
 */
export function getPageItems<T>(items: T[], pagination: PaginationState): T[] {
  return items.slice(pagination.startIndex, pagination.endIndex);
}

/**
 * Calculate pagination state from total items and current page/limit
 */
export function calculatePaginationState(
  totalItems: number,
  page: number,
  limit: number
): PaginationState {
  const totalPages = Math.ceil(totalItems / limit);
  const validPage = Math.min(Math.max(1, page), totalPages || 1);
  const startIndex = (validPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);

  return {
    page: validPage,
    limit,
    totalItems,
    totalPages,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
    startIndex,
    endIndex,
  };
}

/**
 * Generate an array of page numbers to display
 */
export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): number[] {
  const numbers: number[] = [];

  if (totalPages <= maxVisible) {
    // Show all page numbers if total is small
    for (let i = 1; i <= totalPages; i++) {
      numbers.push(i);
    }
  } else {
    // Show a window of page numbers around the current page
    const halfWindow = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - halfWindow);
    const end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust if we're near the end
    if (end === totalPages) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }
  }

  return numbers;
}

/**
 * Validate page number and return a valid one
 */
export function validatePageNumber(
  page: number,
  totalPages: number
): number {
  if (totalPages === 0) return 1;
  return Math.max(1, Math.min(page, totalPages));
}

/**
 * Validate limit and return a valid one
 */
export function validateLimit(limit: number, min: number = 1, max: number = 100): number {
  return Math.max(min, Math.min(limit, max));
}

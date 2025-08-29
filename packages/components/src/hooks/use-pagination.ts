"use client";

import { useCallback, useMemo, useState } from "react";

export interface PaginationState {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface UsePaginationOptions {
  totalItems: number;
  defaultLimit?: number;
  defaultPage?: number;
  onPageChange?: (page: number, limit: number) => void;
}

export interface UsePaginationReturn extends PaginationState {
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setLimit: (limit: number) => void;
}

export function usePagination({
  totalItems,
  defaultLimit = 10,
  defaultPage = 1,
  onPageChange,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [currentLimit, setCurrentLimit] = useState(defaultLimit);

  // Calculate pagination state
  const paginationState = useMemo((): PaginationState => {
    const totalPages = Math.ceil(totalItems / currentLimit);
    const page = Math.min(currentPage, totalPages || 1); // Ensure page doesn't exceed total pages
    const startIndex = (page - 1) * currentLimit;
    const endIndex = Math.min(startIndex + currentLimit, totalItems);

    return {
      page,
      limit: currentLimit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      startIndex,
      endIndex,
    };
  }, [currentPage, currentLimit, totalItems]);

  // Update page and notify parent
  const updatePage = useCallback(
    (newPage: number, newLimit?: number) => {
      const validPage = Math.max(1, newPage);
      const validLimit = newLimit
        ? Math.max(1, Math.min(100, newLimit))
        : currentLimit;

      setCurrentPage(validPage);
      if (newLimit) {
        setCurrentLimit(validLimit);
      }

      onPageChange?.(validPage, validLimit);
    },
    [currentLimit, onPageChange]
  );

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(
        1,
        Math.min(page, paginationState.totalPages || 1)
      );
      updatePage(validPage);
    },
    [updatePage, paginationState.totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (paginationState.hasNextPage) {
      updatePage(paginationState.page + 1);
    }
  }, [updatePage, paginationState.hasNextPage, paginationState.page]);

  const goToPreviousPage = useCallback(() => {
    if (paginationState.hasPreviousPage) {
      updatePage(paginationState.page - 1);
    }
  }, [updatePage, paginationState.hasPreviousPage, paginationState.page]);

  const goToFirstPage = useCallback(() => {
    updatePage(1);
  }, [updatePage]);

  const goToLastPage = useCallback(() => {
    updatePage(paginationState.totalPages);
  }, [updatePage, paginationState.totalPages]);

  const setLimit = useCallback(
    (limit: number) => {
      const validLimit = Math.max(1, Math.min(100, limit));
      updatePage(1, validLimit); // Reset to first page when changing limit
    },
    [updatePage]
  );

  return {
    ...paginationState,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setLimit,
  };
}

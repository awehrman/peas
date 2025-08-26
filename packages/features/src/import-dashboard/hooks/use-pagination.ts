import { useCallback, useMemo } from "react";

import { useRouter, useSearchParams } from "next/navigation";

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
  maxLimit?: number;
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
  maxLimit = 100,
}: UsePaginationOptions): UsePaginationReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current page and limit from URL params with error handling
  const currentPage = useMemo(() => {
    try {
      const pageParam = searchParams.get("page");
      if (!pageParam) return defaultPage;

      const page = parseInt(pageParam, 10);
      return Math.max(1, isNaN(page) ? defaultPage : page);
    } catch {
      // If parsing fails, use default values
      return defaultPage;
    }
  }, [searchParams, defaultPage]);

  const currentLimit = useMemo(() => {
    try {
      const limitParam = searchParams.get("limit");
      if (!limitParam) return defaultLimit;

      const limit = parseInt(limitParam, 10);
      return Math.max(
        1,
        Math.min(maxLimit, isNaN(limit) ? defaultLimit : limit)
      );
    } catch {
      return defaultLimit;
    }
  }, [searchParams, defaultLimit, maxLimit]);

  // Calculate pagination state
  const paginationState = useMemo((): PaginationState => {
    const totalPages = Math.max(1, Math.ceil(totalItems / currentLimit));
    const page = Math.min(currentPage, totalPages);
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

  // Update URL with new pagination params
  const updateURL = useCallback(
    (newPage: number, newLimit?: number) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }

      const limitToSet = newLimit ?? currentLimit;
      if (limitToSet !== defaultLimit) {
        params.set("limit", limitToSet.toString());
      } else {
        params.delete("limit");
      }

      const newURL = params.toString() ? `?${params.toString()}` : "";
      router.push(newURL, { scroll: false });
    },
    [router, searchParams, defaultLimit, currentLimit]
  );

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, paginationState.totalPages));
      updateURL(validPage);
    },
    [updateURL, paginationState.totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (paginationState.hasNextPage) {
      updateURL(paginationState.page + 1);
    }
  }, [updateURL, paginationState.hasNextPage, paginationState.page]);

  const goToPreviousPage = useCallback(() => {
    if (paginationState.hasPreviousPage) {
      updateURL(paginationState.page - 1);
    }
  }, [updateURL, paginationState.hasPreviousPage, paginationState.page]);

  const goToFirstPage = useCallback(() => {
    updateURL(1);
  }, [updateURL]);

  const goToLastPage = useCallback(() => {
    updateURL(paginationState.totalPages);
  }, [updateURL, paginationState.totalPages]);

  const setLimit = useCallback(
    (limit: number) => {
      const validLimit = Math.max(1, Math.min(maxLimit, limit));
      updateURL(1, validLimit); // Reset to first page when changing limit
    },
    [updateURL, maxLimit]
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

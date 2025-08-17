import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

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
}: UsePaginationOptions): UsePaginationReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current page and limit from URL params with error handling
  const currentPage = useMemo(() => {
    try {
      const pageParam = searchParams.get("page");
      const page = pageParam ? parseInt(pageParam, 10) : defaultPage;
      return Math.max(1, isNaN(page) ? defaultPage : page);
    } catch (error) {
      console.warn("Failed to parse page parameter:", error);
      return defaultPage;
    }
  }, [searchParams, defaultPage]);

  const currentLimit = useMemo(() => {
    try {
      const limitParam = searchParams.get("limit");
      const limit = limitParam ? parseInt(limitParam, 10) : defaultLimit;
      return Math.max(1, Math.min(100, isNaN(limit) ? defaultLimit : limit)); // Ensure limit is between 1 and 100
    } catch (error) {
      console.warn("Failed to parse limit parameter:", error);
      return defaultLimit;
    }
  }, [searchParams, defaultLimit]);

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

  // Update URL with new pagination params
  const updateURL = useCallback(
    (newPage: number, newLimit?: number) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (newPage > 1) {
        params.set("page", newPage.toString());
      } else {
        params.delete("page");
      }

      if (newLimit && newLimit !== defaultLimit) {
        params.set("limit", newLimit.toString());
      } else {
        params.delete("limit");
      }

      const newURL = params.toString() ? `?${params.toString()}` : "";
      router.push(newURL, { scroll: false });
    },
    [router, searchParams, defaultLimit]
  );

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, paginationState.totalPages || 1));
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
      const validLimit = Math.max(1, Math.min(100, limit));
      updateURL(1, validLimit); // Reset to first page when changing limit
    },
    [updateURL]
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

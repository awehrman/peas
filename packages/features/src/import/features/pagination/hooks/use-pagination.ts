import { useCallback, useEffect, useReducer } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { paginationReducer } from "../reducers/pagination-reducer";
import { UsePaginationOptions, UsePaginationReturn } from "../types/pagination";

const initialState = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startIndex: 0,
  endIndex: 0,
};

export function usePagination({
  totalItems,
  defaultLimit = 10,
  defaultPage = 1,
}: UsePaginationOptions): UsePaginationReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state with URL params
  const [state, dispatch] = useReducer(paginationReducer, initialState, () => {
    try {
      const pageParam = searchParams.get("page");
      const limitParam = searchParams.get("limit");

      const page = pageParam ? parseInt(pageParam, 10) : defaultPage;
      const limit = limitParam ? parseInt(limitParam, 10) : defaultLimit;

      const validPage = Math.max(1, isNaN(page) ? defaultPage : page);
      const validLimit = Math.max(
        1,
        Math.min(100, isNaN(limit) ? defaultLimit : limit)
      );

      return {
        ...initialState,
        page: validPage,
        limit: validLimit,
        totalItems,
      };
    } catch {
      return {
        ...initialState,
        page: defaultPage,
        limit: defaultLimit,
        totalItems,
      };
    }
  });

  // Update state when totalItems changes
  useEffect(() => {
    dispatch({ type: "SET_TOTAL_ITEMS", payload: totalItems });
  }, [totalItems]);

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
      const validPage = Math.max(1, Math.min(page, state.totalPages || 1));
      dispatch({ type: "SET_PAGE", payload: validPage });
      updateURL(validPage);
    },
    [updateURL, state.totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (state.hasNextPage) {
      const nextPage = state.page + 1;
      dispatch({ type: "GO_TO_NEXT_PAGE" });
      updateURL(nextPage);
    }
  }, [updateURL, state.hasNextPage, state.page]);

  const goToPreviousPage = useCallback(() => {
    if (state.hasPreviousPage) {
      const prevPage = state.page - 1;
      dispatch({ type: "GO_TO_PREVIOUS_PAGE" });
      updateURL(prevPage);
    }
  }, [updateURL, state.hasPreviousPage, state.page]);

  const goToFirstPage = useCallback(() => {
    dispatch({ type: "GO_TO_FIRST_PAGE" });
    updateURL(1);
  }, [updateURL]);

  const goToLastPage = useCallback(() => {
    dispatch({ type: "GO_TO_LAST_PAGE" });
    updateURL(state.totalPages);
  }, [updateURL, state.totalPages]);

  const setLimit = useCallback(
    (limit: number) => {
      const validLimit = Math.max(1, Math.min(100, limit));
      dispatch({ type: "SET_LIMIT", payload: validLimit });
      updateURL(1, validLimit); // Reset to first page when changing limit
    },
    [updateURL]
  );

  return {
    ...state,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setLimit,
  };
}

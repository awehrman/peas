"use client";

import { ReactNode, createContext, useContext } from "react";

import { usePagination } from "../hooks/use-pagination";
import { PaginationContextValue, UsePaginationOptions } from "../types/pagination";

const PaginationContext = createContext<PaginationContextValue | undefined>(
  undefined
);

interface PaginationProviderProps extends UsePaginationOptions {
  children: ReactNode;
}

export function PaginationProvider({
  children,
  ...options
}: PaginationProviderProps): React.ReactElement {
  const pagination = usePagination(options);

  const contextValue: PaginationContextValue = {
    state: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
      startIndex: pagination.startIndex,
      endIndex: pagination.endIndex,
    },
    actions: {
      goToPage: pagination.goToPage,
      goToNextPage: pagination.goToNextPage,
      goToPreviousPage: pagination.goToPreviousPage,
      goToFirstPage: pagination.goToFirstPage,
      goToLastPage: pagination.goToLastPage,
      setLimit: pagination.setLimit,
    },
  };

  return (
    <PaginationContext.Provider value={contextValue}>
      {children}
    </PaginationContext.Provider>
  );
}

export function usePaginationContext(): PaginationContextValue {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error(
      "usePaginationContext must be used within a PaginationProvider"
    );
  }
  return context;
}

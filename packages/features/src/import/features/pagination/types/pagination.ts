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

export interface PaginationControlsProps {
  totalItems: number;
  className?: string;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
}

export interface PaginationSummaryProps {
  totalItems: number;
  className?: string;
  showRange?: boolean;
  showTotal?: boolean;
}

export interface PaginationContextValue {
  state: PaginationState;
  actions: {
    goToPage: (page: number) => void;
    goToNextPage: () => void;
    goToPreviousPage: () => void;
    goToFirstPage: () => void;
    goToLastPage: () => void;
    setLimit: (limit: number) => void;
  };
}

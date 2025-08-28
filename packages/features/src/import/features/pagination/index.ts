// Types
export type {
  PaginationState,
  UsePaginationOptions,
  UsePaginationReturn,
  PaginationControlsProps,
  PaginationSummaryProps,
  PaginationContextValue,
} from "./types/pagination";

// Reducers
export { paginationReducer } from "./reducers/pagination-reducer";
export type { PaginationAction } from "./reducers/pagination-reducer";

// Hooks
export { usePagination } from "./hooks/use-pagination";
export { usePaginatedItems } from "./hooks/use-paginated-items";

// Contexts
export { PaginationProvider, usePaginationContext } from "./contexts/pagination-context";

// Components
export { PaginationControls, PaginationSummary } from "./components";

// Utils
export {
  getPageItems,
  calculatePaginationState,
  getVisiblePageNumbers,
  validatePageNumber,
  validateLimit,
} from "./utils/pagination-utils";

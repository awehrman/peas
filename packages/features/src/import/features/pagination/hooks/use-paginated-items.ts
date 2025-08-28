import { useMemo } from "react";
import { usePaginationContext } from "../contexts/pagination-context";
import { getPageItems } from "../utils/pagination-utils";

export function usePaginatedItems<T>(
  items: T[]
): {
  allItems: T[];
  paginatedItems: T[];
  hasItems: boolean;
} {
  const { state } = usePaginationContext();

  const paginatedItems = useMemo(() => {
    return getPageItems(items, state);
  }, [items, state]);

  return {
    allItems: items,
    paginatedItems,
    hasItems: items.length > 0,
  };
}

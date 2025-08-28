import { useCallback, useReducer } from "react";

import { UseCollapsibleGroupOptions, CollapsibleGroupState } from "../types/collapsible";
import { collapsibleGroupReducer } from "../reducers/collapsible-reducer";

const initialState: CollapsibleGroupState = {
  expandedItems: new Set(),
  defaultExpanded: false,
  allowMultiple: false,
};

export function useCollapsibleGroup(options: UseCollapsibleGroupOptions = {}) {
  const {
    defaultExpanded = false,
    allowMultiple = false,
    onItemToggle,
  } = options;

  const [state, dispatch] = useReducer(collapsibleGroupReducer, {
    ...initialState,
    defaultExpanded,
    allowMultiple,
  });

  const toggleItem = useCallback((itemId: string) => {
    dispatch({ type: "TOGGLE_ITEM", payload: itemId });
    const isExpanded = !state.expandedItems.has(itemId);
    onItemToggle?.(itemId, isExpanded);
  }, [state.expandedItems, onItemToggle]);

  const expandItem = useCallback((itemId: string) => {
    dispatch({ type: "EXPAND_ITEM", payload: itemId });
    onItemToggle?.(itemId, true);
  }, [onItemToggle]);

  const collapseItem = useCallback((itemId: string) => {
    dispatch({ type: "COLLAPSE_ITEM", payload: itemId });
    onItemToggle?.(itemId, false);
  }, [onItemToggle]);

  const expandAll = useCallback(() => {
    dispatch({ type: "EXPAND_ALL" });
  }, []);

  const collapseAll = useCallback(() => {
    dispatch({ type: "COLLAPSE_ALL" });
  }, []);

  const setItemExpanded = useCallback((itemId: string, expanded: boolean) => {
    dispatch({ type: "SET_ITEM_EXPANDED", payload: { itemId, expanded } });
    onItemToggle?.(itemId, expanded);
  }, [onItemToggle]);

  const isExpanded = useCallback((itemId: string) => {
    return state.expandedItems.has(itemId);
  }, [state.expandedItems]);

  return {
    expandedItems: state.expandedItems,
    allowMultiple: state.allowMultiple,
    toggleItem,
    expandItem,
    collapseItem,
    expandAll,
    collapseAll,
    setItemExpanded,
    isExpanded,
  };
}

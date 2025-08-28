import { CollapsibleState, CollapsibleGroupState } from "../types/collapsible";

export type CollapsibleAction =
  | { type: "TOGGLE" }
  | { type: "EXPAND" }
  | { type: "COLLAPSE" }
  | { type: "SET_EXPANDED"; payload: boolean }
  | { type: "SET_ANIMATING"; payload: boolean }
  | { type: "SET_CONTENT_HEIGHT"; payload: number }
  | { type: "SET_TRANSITION_DURATION"; payload: number };

export type CollapsibleGroupAction =
  | { type: "TOGGLE_ITEM"; payload: string }
  | { type: "EXPAND_ITEM"; payload: string }
  | { type: "COLLAPSE_ITEM"; payload: string }
  | { type: "EXPAND_ALL" }
  | { type: "COLLAPSE_ALL" }
  | { type: "SET_ITEM_EXPANDED"; payload: { itemId: string; expanded: boolean } };

export function collapsibleReducer(
  state: CollapsibleState,
  action: CollapsibleAction
): CollapsibleState {
  switch (action.type) {
    case "TOGGLE":
      return {
        ...state,
        isExpanded: !state.isExpanded,
      };

    case "EXPAND":
      return {
        ...state,
        isExpanded: true,
      };

    case "COLLAPSE":
      return {
        ...state,
        isExpanded: false,
      };

    case "SET_EXPANDED":
      return {
        ...state,
        isExpanded: action.payload,
      };

    case "SET_ANIMATING":
      return {
        ...state,
        isAnimating: action.payload,
      };

    case "SET_CONTENT_HEIGHT":
      return {
        ...state,
        contentHeight: action.payload,
      };

    case "SET_TRANSITION_DURATION":
      return {
        ...state,
        transitionDuration: action.payload,
      };

    default:
      return state;
  }
}

export function collapsibleGroupReducer(
  state: CollapsibleGroupState,
  action: CollapsibleGroupAction
): CollapsibleGroupState {
  switch (action.type) {
    case "TOGGLE_ITEM": {
      const newExpandedItems = new Set(state.expandedItems);
      if (newExpandedItems.has(action.payload)) {
        newExpandedItems.delete(action.payload);
      } else {
        if (!state.allowMultiple) {
          newExpandedItems.clear();
        }
        newExpandedItems.add(action.payload);
      }
      
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    case "EXPAND_ITEM": {
      const newExpandedItems = new Set(state.expandedItems);
      if (!state.allowMultiple) {
        newExpandedItems.clear();
      }
      newExpandedItems.add(action.payload);
      
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    case "COLLAPSE_ITEM": {
      const newExpandedItems = new Set(state.expandedItems);
      newExpandedItems.delete(action.payload);
      
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    case "EXPAND_ALL": {
      const allItemIds = Array.from(state.expandedItems);
      const newExpandedItems = new Set(allItemIds);
      
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    case "COLLAPSE_ALL": {
      return {
        ...state,
        expandedItems: new Set(),
      };
    }

    case "SET_ITEM_EXPANDED": {
      const newExpandedItems = new Set(state.expandedItems);
      if (action.payload.expanded) {
        if (!state.allowMultiple) {
          newExpandedItems.clear();
        }
        newExpandedItems.add(action.payload.itemId);
      } else {
        newExpandedItems.delete(action.payload.itemId);
      }
      
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    default:
      return state;
  }
}

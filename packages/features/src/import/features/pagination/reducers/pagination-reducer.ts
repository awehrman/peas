import { PaginationState } from "../types/pagination";

export type PaginationAction =
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_LIMIT"; payload: number }
  | { type: "SET_TOTAL_ITEMS"; payload: number }
  | { type: "GO_TO_NEXT_PAGE" }
  | { type: "GO_TO_PREVIOUS_PAGE" }
  | { type: "GO_TO_FIRST_PAGE" }
  | { type: "GO_TO_LAST_PAGE" }
  | { type: "RESET"; payload: Partial<PaginationState> };

export function paginationReducer(
  state: PaginationState,
  action: PaginationAction
): PaginationState {
  switch (action.type) {
    case "SET_PAGE": {
      const page = Math.max(1, Math.min(action.payload, state.totalPages || 1));
      const startIndex = (page - 1) * state.limit;
      const endIndex = Math.min(startIndex + state.limit, state.totalItems);
      
      return {
        ...state,
        page,
        hasNextPage: page < state.totalPages,
        hasPreviousPage: page > 1,
        startIndex,
        endIndex,
      };
    }

    case "SET_LIMIT": {
      const limit = Math.max(1, Math.min(100, action.payload));
      const totalPages = Math.ceil(state.totalItems / limit);
      const page = Math.min(state.page, totalPages || 1);
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, state.totalItems);
      
      return {
        ...state,
        limit,
        totalPages,
        page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        startIndex,
        endIndex,
      };
    }

    case "SET_TOTAL_ITEMS": {
      const totalItems = Math.max(0, action.payload);
      const totalPages = Math.ceil(totalItems / state.limit);
      const page = Math.min(state.page, totalPages || 1);
      const startIndex = (page - 1) * state.limit;
      const endIndex = Math.min(startIndex + state.limit, totalItems);
      
      return {
        ...state,
        totalItems,
        totalPages,
        page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        startIndex,
        endIndex,
      };
    }

    case "GO_TO_NEXT_PAGE": {
      if (!state.hasNextPage) return state;
      return paginationReducer(state, {
        type: "SET_PAGE",
        payload: state.page + 1,
      });
    }

    case "GO_TO_PREVIOUS_PAGE": {
      if (!state.hasPreviousPage) return state;
      return paginationReducer(state, {
        type: "SET_PAGE",
        payload: state.page - 1,
      });
    }

    case "GO_TO_FIRST_PAGE": {
      return paginationReducer(state, {
        type: "SET_PAGE",
        payload: 1,
      });
    }

    case "GO_TO_LAST_PAGE": {
      return paginationReducer(state, {
        type: "SET_PAGE",
        payload: state.totalPages,
      });
    }

    case "RESET": {
      const resetState = { ...state, ...action.payload };
      return paginationReducer(resetState, {
        type: "SET_TOTAL_ITEMS",
        payload: resetState.totalItems,
      });
    }

    default:
      return state;
  }
}

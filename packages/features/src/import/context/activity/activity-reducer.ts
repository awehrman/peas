import type { ActivityAction, ActivityState } from "../../types/import-types";

/**
 * Activity reducer - handles activity log state
 * Optimized with better array operations for performance
 */
export function activityReducer(
  state: ActivityState,
  action: ActivityAction
): ActivityState {
  switch (action.type) {
    case "ADD_IMPORT_CARD": {
      const existingIds = state.pageToCardIds[action.pageIndex] || [];
      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.card.id]: action.card,
        },
        pageToCardIds: {
          ...state.pageToCardIds,
          [action.pageIndex]: [...existingIds, action.card.id],
        },
      };
    }

    case "TOGGLE_CARD_EXPANDED": {
      const card = state.cardsById[action.cardId];
      if (!card) return state;
      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.cardId]: { ...card, isExpanded: !card.isExpanded },
        },
      };
    }

    case "UPDATE_CARD_STATUS": {
      const existing = state.cardsById[action.cardId];
      if (!existing) return state;
      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.cardId]: {
            ...existing,
            status: {
              ...existing.status,
              [action.step]: {
                ...existing.status[action.step],
                ...action.statusUpdate,
              },
            },
          },
        },
      };
    }

    case "UPDATE_CARD_TITLE": {
      const card = state.cardsById[action.cardId];
      if (!card) return state;
      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.cardId]: {
            ...card,
            imageThumbnail: action.title,
          },
        },
      };
    }

    case "SET_PAGE":
      return {
        ...state,
        currentPageIndex: action.pageIndex,
      };

    case "RESET_ACTIVITY":
      return {
        currentPageIndex: 0,
        pageToCardIds: {},
        cardsById: {},
      };

    default:
      return state;
  }
}

export const defaultActivityState: ActivityState = {
  currentPageIndex: 0,
  pageToCardIds: {},
  cardsById: {},
};

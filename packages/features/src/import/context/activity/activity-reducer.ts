import { CARDS_PER_PAGE } from "../../constants/activity-constants";
import type { ActivityAction, ActivityState } from "../../types/import-types";

/**
 * Applies a group of actions in order, so a burst of websocket events
 * costs a single render.
 */
export function activityBatchReducer(
  state: ActivityState,
  actions: readonly ActivityAction[]
): ActivityState {
  return actions.reduce(activityReducer, state);
}

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
      if (state.cardsById[action.card.id]) return state;
      const pageIndex = Math.floor(
        Object.keys(state.cardsById).length / CARDS_PER_PAGE
      );
      const existingIds = state.pageToCardIds[pageIndex] || [];
      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.card.id]: action.card,
        },
        pageToCardIds: {
          ...state.pageToCardIds,
          [pageIndex]: [...existingIds, action.card.id],
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
            noteId: existing.noteId ?? action.noteId,
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

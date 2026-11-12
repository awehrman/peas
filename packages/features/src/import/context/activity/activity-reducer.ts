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
 */
export function activityReducer(
  state: ActivityState,
  action: ActivityAction
): ActivityState {
  switch (action.type) {
    case "ADD_IMPORT_CARD": {
      if (state.cardsById[action.card.id]) return state;
      return {
        cardIds: [...state.cardIds, action.card.id],
        cardsById: {
          ...state.cardsById,
          [action.card.id]: action.card,
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

    case "UPDATE_CARD_DETAILS": {
      const card = state.cardsById[action.cardId];
      if (!card) return state;
      return {
        ...state,
        cardsById: {
          ...state.cardsById,
          [action.cardId]: { ...card, ...action.details },
        },
      };
    }

    case "RESET_ACTIVITY":
      return defaultActivityState;

    default:
      return state;
  }
}

export const defaultActivityState: ActivityState = {
  cardIds: [],
  cardsById: {},
};

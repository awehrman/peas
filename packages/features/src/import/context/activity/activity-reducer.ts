import type {
  ActivityAction,
  ActivityState,
  ImportCard,
  StepStatus,
} from "../../types/import-types";

/**
 * Applies a group of actions in order, so a burst of websocket events
 * costs a single render. The card map is copied once per batch rather than
 * once per action, which keeps large imports cheap.
 */
export function activityBatchReducer(
  state: ActivityState,
  actions: readonly ActivityAction[]
): ActivityState {
  let cardIds = state.cardIds;
  let cardsById = state.cardsById;
  let ownsCardIds = false;
  let ownsCardsById = false;

  const writableCards = () => {
    if (!ownsCardsById) {
      cardsById = { ...cardsById };
      ownsCardsById = true;
    }
    return cardsById;
  };

  for (const action of actions) {
    switch (action.type) {
      case "ADD_IMPORT_CARD": {
        if (cardsById[action.card.id]) break;
        if (!ownsCardIds) {
          cardIds = [...cardIds];
          ownsCardIds = true;
        }
        cardIds.push(action.card.id);
        writableCards()[action.card.id] = action.card;
        break;
      }

      case "UPDATE_CARD_STATUS": {
        const card = cardsById[action.cardId];
        if (!card) break;
        writableCards()[action.cardId] = {
          ...card,
          noteId: card.noteId ?? action.noteId,
          status: {
            ...card.status,
            [action.step]: mergeStepStatus(card.status[action.step], action.statusUpdate),
          },
        };
        break;
      }

      case "UPDATE_CARD_DETAILS": {
        const card = cardsById[action.cardId];
        if (!card) break;
        writableCards()[action.cardId] = mergeDetails(card, action.details);
        break;
      }

      case "RESET_ACTIVITY":
        cardIds = defaultActivityState.cardIds;
        cardsById = defaultActivityState.cardsById;
        ownsCardIds = false;
        ownsCardsById = false;
        break;
    }
  }

  return cardIds === state.cardIds && cardsById === state.cardsById
    ? state
    : { cardIds, cardsById };
}

/**
 * Activity reducer - handles activity log state
 */
export function activityReducer(
  state: ActivityState,
  action: ActivityAction
): ActivityState {
  return activityBatchReducer(state, [action]);
}

/**
 * Queue events can arrive out of order, so progress only moves forward:
 * a finished step stays finished, counts never shrink, and an error stays
 * visible after later events for the same step.
 */
function mergeStepStatus(existing: StepStatus, update: Partial<StepStatus>): StepStatus {
  return {
    ...existing,
    ...update,
    started: existing.started || Boolean(update.started),
    completed: existing.completed || Boolean(update.completed),
    hasError: existing.hasError || Boolean(update.hasError),
    errorMessage: update.errorMessage ?? existing.errorMessage,
    processedSteps:
      existing.processedSteps !== undefined && update.processedSteps !== undefined
        ? Math.max(existing.processedSteps, update.processedSteps)
        : (update.processedSteps ?? existing.processedSteps),
  };
}

function mergeDetails(card: ImportCard, details: Partial<ImportCard>): ImportCard {
  return { ...card, ...details, isComplete: card.isComplete || Boolean(details.isComplete) };
}

export const defaultActivityState: ActivityState = {
  cardIds: [],
  cardsById: {},
};

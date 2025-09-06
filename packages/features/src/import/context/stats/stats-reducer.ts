import type { ImportStatsState, StatsAction } from "../../types/import-types";

/**
 * Stats reducer - handles import statistics
 */
export function statsReducer(
  state: ImportStatsState,
  action: StatsAction
): ImportStatsState {
  switch (action.type) {
    case "INCREMENT_INGREDIENTS":
      return {
        ...state,
        numberOfIngredients: state.numberOfIngredients + action.count,
      };

    case "INCREMENT_NOTES":
      return {
        ...state,
        numberOfNotes: state.numberOfNotes + action.count,
      };

    case "INCREMENT_ERRORS":
      return {
        ...state,
        numberOfParsingErrors: state.numberOfParsingErrors + action.count,
      };

    case "RESET_STATS":
      return {
        numberOfIngredients: 0,
        numberOfNotes: 0,
        numberOfParsingErrors: 0,
      };

    default:
      return state;
  }
}

export const defaultStatsState: ImportStatsState = {
  numberOfIngredients: 0,
  numberOfNotes: 0,
  numberOfParsingErrors: 0,
};

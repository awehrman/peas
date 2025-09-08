import type { ImportStatsState, StatsAction } from "../../types/import-types";

/**
 * Stats reducer - handles import statistics
 * Only handles REFRESH_STATS to update with fresh data from server
 */
export function statsReducer(
  state: ImportStatsState,
  action: StatsAction
): ImportStatsState {
  switch (action.type) {
    case "REFRESH_STATS":
      return action.stats;

    default:
      return state;
  }
}

export const defaultStatsState: ImportStatsState = {
  numberOfIngredients: 0,
  numberOfNotes: 0,
  numberOfParsingErrors: 0,
};

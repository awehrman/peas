import {
  CategorizationAction,
  CategorizationState,
  CategorizationResult,
} from "./types";

export class CategorizationProcessor {
  private static initialState(noteId: string): CategorizationState {
    return {
      noteId,
      categories: [],
      tags: [],
    };
  }

  private static reducer(
    state: CategorizationState,
    action: CategorizationAction
  ): CategorizationState {
    switch (action.type) {
      case "APPLY_CATEGORY":
        if (!state.categories.includes(action.payload.category)) {
          return {
            ...state,
            categories: [...state.categories, action.payload.category],
          };
        }
        return state;

      case "APPLY_TAG":
        if (!state.tags.includes(action.payload.tag)) {
          return {
            ...state,
            tags: [...state.tags, action.payload.tag],
          };
        }
        return state;

      default:
        return state;
    }
  }

  static applyCategory(noteId: string, category: string): void {
    // Stub implementation - just log for now
    console.log(`Applying category "${category}" to note ${noteId}`);
  }

  static applyTag(noteId: string, tag: string): void {
    // Stub implementation - just log for now
    console.log(`Applying tag "${tag}" to note ${noteId}`);
  }

  static processCategorization(
    noteId: string,
    actions: CategorizationAction[]
  ): CategorizationResult {
    let state = this.initialState(noteId);

    for (const action of actions) {
      state = this.reducer(state, action);

      // Apply the action to the actual system (stub for now)
      if (action.type === "APPLY_CATEGORY") {
        this.applyCategory(action.payload.noteId, action.payload.category);
      } else if (action.type === "APPLY_TAG") {
        this.applyTag(action.payload.noteId, action.payload.tag);
      }
    }

    return {
      noteId: state.noteId,
      categories: state.categories,
      tags: state.tags,
    };
  }
}

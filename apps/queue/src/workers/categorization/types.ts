export interface CategoryAction {
  type: "APPLY_CATEGORY";
  payload: {
    noteId: string;
    category: string;
  };
}

export interface TagAction {
  type: "APPLY_TAG";
  payload: {
    noteId: string;
    tag: string;
  };
}

export type CategorizationAction = CategoryAction | TagAction;

export interface CategorizationState {
  noteId: string;
  categories: string[];
  tags: string[];
}

export interface CategorizationResult {
  noteId: string;
  categories: string[];
  tags: string[];
}

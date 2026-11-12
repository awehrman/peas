export interface LabelCount {
  label: string;
  count: number;
}

export interface TopIngredient {
  ingredientId: string;
  name: string;
  lineCount: number;
}

export interface NoteStatusCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  duplicate: number;
}

export interface IngredientLineStats {
  total: number;
  parsedSuccessfully: number;
  parsedWithErrors: number;
  awaitingParsing: number;
  markedCorrect: number;
  markedIncorrect: number;
}

export interface YearCount {
  year: number;
  count: number;
}

/** Mirrors the `dashboardStats` GraphQL query. */
export interface DashboardStats {
  noteCount: number;
  recipeCount: number;
  notesReadyToPromote: number;
  ingredientCount: number;
  reviewedIngredientCount: number;
  instructionLineCount: number;
  notesByStatus: NoteStatusCounts;
  ingredientLines: IngredientLineStats;
  topIngredients: TopIngredient[];
  topSources: LabelCount[];
  topCategories: LabelCount[];
  topTags: LabelCount[];
  notesBySavedYear: YearCount[];
}

export interface IngredientLine {
  id: string;
  reference: string;
}

export interface ProcessingState {
  errorCount: number;
  total: number;
  current: number;
  parseStatus: "CORRECT" | "ERROR";
}

export interface ProcessingResult {
  errorCount: number;
  total: number;
  successCount: number;
}

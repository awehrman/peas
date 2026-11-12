export interface ParsedLineSegment {
  index: number;
  type: string;
  value: string;
  rule?: string;
  ingredientId?: string;
}

export type ParsedLineStatus =
  | "AWAITING_PARSING"
  | "COMPLETED_WITH_ERROR"
  | "COMPLETED_SUCCESSFULLY";

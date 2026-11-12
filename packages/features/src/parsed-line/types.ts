export interface ParsedLineSegment {
  index: number;
  type: string;
  value: string;
  rule?: string | null;
  ingredientId?: string | null;
}

export type ParsedLineStatus =
  "AWAITING_PARSING" | "COMPLETED_WITH_ERROR" | "COMPLETED_SUCCESSFULLY";

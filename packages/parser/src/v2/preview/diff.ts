import type { IngredientLineSyntax } from "../ast/types.js";
import { describeSyntax } from "../debug/describe.js";

export interface SyntaxDiff {
  changed: boolean;
  before: string;
  after: string;
}

/** Compares two parses of the same line by their readable summaries. */
export function diffSyntax(before: IngredientLineSyntax, after: IngredientLineSyntax): SyntaxDiff {
  const beforeText = describeSyntax(before);
  const afterText = describeSyntax(after);
  return { changed: beforeText !== afterText, before: beforeText, after: afterText };
}

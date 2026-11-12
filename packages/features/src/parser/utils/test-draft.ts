import type { GrammarTestDraft, GrammarTestExpectationView } from "../types";

/**
 * One expectation per space-separated word. Numbers and fractions are
 * guessed as amounts; everything else starts as an ingredient.
 */
export function splitReferenceIntoExpectations(reference: string): GrammarTestExpectationView[] {
  return reference
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => ({
      value,
      type: /^[\d½⅓⅔¼¾⅛.,/-]+$/.test(value) ? "amount" : "ingredient",
    }));
}

export interface TestDraftErrors {
  reference?: string;
  expectations?: string;
}

export function validateTestDraft(draft: GrammarTestDraft): TestDraftErrors {
  const errors: TestDraftErrors = {};
  if (!draft.reference.trim()) errors.reference = "Enter the line to test";
  if (draft.expectations.length === 0) {
    errors.expectations = "Add at least one expected segment";
  } else if (draft.expectations.some((item) => !item.type.trim() || !item.value.trim())) {
    errors.expectations = "Every expected segment needs a type and a value";
  }
  return errors;
}

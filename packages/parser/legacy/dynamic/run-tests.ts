import type {
  GrammarTestExpectationInput,
  GrammarTestInput,
  GrammarTestSuiteResult,
  NormalizedParseResult,
  NormalizedSegment,
} from "./types.js";

export type ParseLine = (input: string) => NormalizedParseResult;

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * A test passes when the parser's segments match the expectations one for
 * one, in order, comparing type exactly and value case-insensitively.
 */
export function segmentsMatchExpectations(
  actual: NormalizedSegment[],
  expectations: GrammarTestExpectationInput[]
): boolean {
  if (actual.length !== expectations.length) return false;

  return expectations.every((expectation, index) => {
    const segment = actual[index];
    return (
      segment !== undefined &&
      segment.type === expectation.type &&
      normalizeValue(segment.value) === normalizeValue(expectation.value)
    );
  });
}

export function runGrammarTests(
  parse: ParseLine,
  tests: GrammarTestInput[]
): GrammarTestSuiteResult {
  const results = tests.map((test) => {
    try {
      const actual = parse(test.reference).values;
      return {
        id: test.id,
        reference: test.reference,
        actual,
        passed: segmentsMatchExpectations(actual, test.expectations),
      };
    } catch (error) {
      return {
        id: test.id,
        reference: test.reference,
        actual: [],
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  return {
    passed: results.filter((result) => result.passed).length,
    total: results.length,
    results,
  };
}

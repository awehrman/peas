/**
 * A structural golden case waiting for its expected values, in the shape of `fixtures/golden/structural.dev.json`.
 *
 * @example
 * { id: "pending-w-u-1", input: "rosemary a few sprigs", tags: ["pending"], current: "rosemary a few sprigs", expected: { status: "PARSED", segments: [] } }
 */
export interface GoldenCaseDraft {
  id: string;
  input: string;
  tags: string[];
  /** v2's current reading (`describeSyntax`), for comparison while filling in `expected`. */
  current?: string;
  expected: { status: "PARSED"; segments: never[] };
}

/**
 * A file-name-safe form of a structure signature.
 *
 * @example
 * fixtureSlug("N - x - N - U W") // "n-x-n-u-w"
 * fixtureSlug("W :")             // "w-colon"
 */
export function fixtureSlug(signature: string): string {
  return (
    signature
      .replace(/:/g, " colon ")
      .replace(/\(/g, " open ")
      .replace(/\)/g, " close ")
      .replace(/\//g, " slash ")
      .replace(/,/g, " comma ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "structure"
  );
}

/**
 * Golden cases for a structural pattern's example lines, with empty expected values for the developer to fill in (Phase 6b). Duplicate lines are dropped.
 *
 * @example
 * draftGoldenCases("W U", [{ input: "rosemary a few sprigs" }, { input: "thyme a few sprigs" }])
 * // [{ id: "pending-w-u-1", input: "rosemary a few sprigs", ... }, { id: "pending-w-u-2", ... }]
 */
export function draftGoldenCases(
  signature: string,
  lines: readonly { input: string; current?: string }[]
): GoldenCaseDraft[] {
  const slug = fixtureSlug(signature);
  const seen = new Set<string>();
  return lines
    .filter((line) => {
      if (seen.has(line.input)) return false;
      seen.add(line.input);
      return true;
    })
    .map((line, index) => ({
      id: `pending-${slug}-${index + 1}`,
      input: line.input,
      tags: ["pending"],
      ...(line.current === undefined ? {} : { current: line.current }),
      expected: { status: "PARSED" as const, segments: [] },
    }));
}

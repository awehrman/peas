import { describe, expect, it } from "vitest";

import { describeQuantity } from "../debug/describe.js";
import { processIngredientLine } from "../resolve/process-line.js";
import { ResolutionSchema } from "../resolve/schemas.js";

import { loadFixture } from "./helpers/golden.js";
import { describeCandidate, semanticContext } from "./helpers/resolver.js";

interface SemanticCase {
  id: string;
  input: string;
  expected: {
    quantity: string;
    concept: string | null;
    attributes?: string[];
    preparations?: { operation: string; degree?: string; position: string }[];
    matchedTermKind?: string;
    status?: string;
    unresolved?: string[];
  };
}

describe("semantic golden set (section 32)", () => {
  const context = semanticContext();
  const { cases } = loadFixture<{ cases: SemanticCase[] }>(
    "golden/semantic.json"
  );

  it.each(
    cases.map((semanticCase) => [semanticCase.id, semanticCase] as const)
  )("%s", (_id, { input, expected }) => {
    const { line, mentions } = processIngredientLine(input, context);
    expect(mentions).toHaveLength(1);
    const [mention] = mentions;
    const segment = line.segments[0];
    expect(
      segment?.quantity ? describeQuantity(segment.quantity) : undefined
    ).toBe(expected.quantity);
    expect(ResolutionSchema.safeParse(mention?.resolution).success).toBe(true);

    if (expected.concept === null) {
      expect(mention?.status).toBe(expected.status);
      expect(mention?.resolution.candidates).toEqual([]);
      expect(mention?.resolution.unresolved.map((span) => span.text)).toEqual(
        expected.unresolved
      );
      return;
    }

    expect(mention?.status).toBe("AUTO_RESOLVED");
    const best = describeCandidate(mention?.resolution.candidates[0], context);
    expect(best?.concept).toBe(expected.concept);
    if (expected.attributes)
      expect(best?.attributes).toEqual([...expected.attributes].sort());
    if (expected.preparations)
      expect(best?.preparations).toEqual(expected.preparations);
    if (expected.matchedTermKind)
      expect(best?.entryKind).toBe(expected.matchedTermKind);
  });
});

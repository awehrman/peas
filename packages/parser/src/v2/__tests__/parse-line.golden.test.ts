import { afterAll, describe, expect, it } from "vitest";

import { parseLineBest } from "../parse-line.js";

import {
  loadGoldenCases,
  loadStructuralLexicon,
  toGolden,
} from "./helpers/golden.js";

const lexicon = loadStructuralLexicon();

describe("structural golden set (dev)", () => {
  for (const goldenCase of loadGoldenCases("structural.dev")) {
    const name = `${goldenCase.id}: ${goldenCase.input}`;
    const assertion = () =>
      expect(toGolden(parseLineBest(goldenCase.input, { lexicon }))).toEqual(
        goldenCase.expected
      );

    if (goldenCase.knownFailure) {
      // Fails until the grammar learns the structure; then drop the flag.
      it.fails(`${name} (known failure: ${goldenCase.note})`, assertion);
    } else {
      it(name, assertion);
    }
  }
});

describe("structural golden set (held out)", () => {
  const cases = loadGoldenCases("structural.holdout");
  let passed = 0;

  for (const goldenCase of cases) {
    it(`${goldenCase.id}: ${goldenCase.input}`, () => {
      const matches =
        JSON.stringify(
          toGolden(parseLineBest(goldenCase.input, { lexicon }))
        ) === JSON.stringify(goldenCase.expected);
      if (matches) passed += 1;
    });
  }

  // Reported, not asserted: the held-out set measures generalization.
  afterAll(() => {
    console.info(`Held-out structural accuracy: ${passed}/${cases.length}`);
  });
});

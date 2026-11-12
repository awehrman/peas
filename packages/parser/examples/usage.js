// Example usage of the v2 ingredient-line parser.
// Run after building the package: node packages/parser/examples/usage.js
import { randomUUID } from "node:crypto";

import { buildLexicon, describeSyntax, parseLine, parseLineBest } from "@peas/parser/v2";

const lexicon = buildLexicon({
  revision: 1,
  entries: [
    { id: randomUUID(), text: "all-purpose flour", role: "FOOD" },
    { id: randomUUID(), text: "heaping", role: "MEASUREMENT_MODIFIER" },
    { id: randomUUID(), text: "sifted", role: "PREPARATION" },
    { id: randomUUID(), text: "olive oil", role: "FOOD" },
    { id: randomUUID(), text: "virgin olive oil", role: "FOOD", status: "PROPOSED" },
  ],
});

// One syntax tree in the default CONSERVATIVE mode
const tree = parseLineBest("2 heaping cups all-purpose flour, sifted", { lexicon });
console.log(describeSyntax(tree));
// [2 cup] <{heaping:MEASUREMENT_MODIFIER}> {all-purpose flour:FOOD} , {sifted:PREPARATION}

// EXPLORATORY mode also considers PROPOSED entries and returns alternatives
for (const alternative of parseLine("1 tbsp virgin olive oil", { lexicon, mode: "EXPLORATORY" })) {
  console.log(alternative.segmentationIndex, describeSyntax(alternative));
}
// 0 [1 tbsp] {virgin olive oil:FOOD}
// 1 [1 tbsp] virgin {olive oil:FOOD}

// Without a lexicon the structure still parses; unknown words are kept
console.log(describeSyntax(parseLineBest("1 (14-ounce) can diced tomatoes")));
// [1 (14 oz) can] diced tomatoes

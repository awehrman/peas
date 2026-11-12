/**
 * Extracts the v1 grammar's DESCRIPTORS list and suggests a v2 role and target for each word, for review (Phase 3e). Writes fixtures/lexicon/v1-descriptors.candidates.json. The reviewed result is fixtures/lexicon/modifiers.seed.json; `inSeed` marks words already there.
 *
 *   yarn workspace @peas/parser extract:descriptors
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ATTRIBUTE_DIMENSIONS,
  DEGREE_KEYS,
  INSTRUCTION_KEYS,
  MEASUREMENT_MODIFIER_KEYS,
  PREPARATION_OPERATIONS,
} from "../src/v2/ontology/vocabulary.js";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const grammarPath = join(packageDir, "src/v1/parser.peggy");
const seedPath = join(packageDir, "fixtures/lexicon/modifiers.seed.json");
const outputPath = join(
  packageDir,
  "fixtures/lexicon/v1-descriptors.candidates.json"
);

/** Words that carry no food meaning; suggested as IGNORE. */
const FILLER = new Set(
  "a about actually add almost always an another any approx approx. approximately around as at available before best but cook desired e.g. each eg either enough equal equivalent etc exactly few for from i i.e. ideally ie if in into just kind like little made many more most much my necessary needed no not note of off on or other out over per perfectly plenty plus preferably preferred really recommended required see serve so such than that the their then to too total up us use used using very whatever with without you your".split(
    " "
  )
);

interface Suggestion {
  word: string;
  role:
    | "PREPARATION"
    | "DEGREE"
    | "MEASUREMENT_MODIFIER"
    | "INSTRUCTION"
    | "ATTRIBUTE"
    | "IGNORE"
    | "UNSURE";
  target: string | null;
  reason: string;
  inSeed: boolean;
}

function readDescriptors(): string[] {
  const grammar = readFileSync(grammarPath, "utf8");
  const match = /const DESCRIPTORS = \[([\s\S]*?)\];/.exec(grammar);
  if (!match?.[1]) throw new Error(`DESCRIPTORS not found in ${grammarPath}`);
  return [...match[1].matchAll(/'([^']*)'/g)]
    .map((item) => item[1] ?? "")
    .filter(Boolean);
}

function preparationFor(word: string): string | null {
  const lower = word.toLowerCase();
  for (const { key } of PREPARATION_OPERATIONS) {
    const forms = [
      key,
      `${key}d`,
      `${key}ed`,
      `${key}${key.at(-1)}ed`,
      `${key.replace(/e$/, "")}ed`,
      `${key}en`,
    ];
    if (forms.includes(lower)) return key;
  }
  return null;
}

function attributeFor(word: string): string | null {
  const lower = word.toLowerCase().replace(/\s+/g, "_");
  for (const dimension of ATTRIBUTE_DIMENSIONS) {
    if (dimension.values.some((value) => value.key === lower))
      return `${dimension.key}:${lower}`;
  }
  return null;
}

function suggest(word: string, seeded: Set<string>): Suggestion {
  const lower = word.toLowerCase();
  const inSeed = seeded.has(lower);
  const preparation = preparationFor(word);
  if (preparation)
    return {
      word,
      role: "PREPARATION",
      target: preparation,
      reason: "matches a preparation operation",
      inSeed,
    };
  const attribute = attributeFor(word);
  if (attribute)
    return {
      word,
      role: "ATTRIBUTE",
      target: attribute,
      reason: "matches an attribute value key",
      inSeed,
    };
  const degree = DEGREE_KEYS.find(
    (key) =>
      lower === `${key}ly` ||
      lower === `${key.replace(/e$/, "")}ly` ||
      lower === key
  );
  if (degree)
    return {
      word,
      role: "DEGREE",
      target: degree,
      reason: "matches a degree key",
      inSeed,
    };
  if ((MEASUREMENT_MODIFIER_KEYS as readonly string[]).includes(lower)) {
    return {
      word,
      role: "MEASUREMENT_MODIFIER",
      target: lower,
      reason: "matches a measurement modifier key",
      inSeed,
    };
  }
  if ((INSTRUCTION_KEYS as readonly string[]).includes(lower))
    return {
      word,
      role: "INSTRUCTION",
      target: lower,
      reason: "matches an instruction key",
      inSeed,
    };
  if (FILLER.has(lower))
    return {
      word,
      role: "IGNORE",
      target: null,
      reason: "filler word",
      inSeed,
    };
  if (lower.endsWith("ly"))
    return {
      word,
      role: "DEGREE",
      target: null,
      reason: "ends in -ly; no matching degree key",
      inSeed,
    };
  if (/(ed|en)$/.test(lower))
    return {
      word,
      role: "PREPARATION",
      target: null,
      reason: "ends in -ed/-en; no matching operation",
      inSeed,
    };
  return {
    word,
    role: "UNSURE",
    target: null,
    reason: "no heuristic applies",
    inSeed,
  };
}

function main(): void {
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as {
    entries: { text: string }[];
  };
  const seeded = new Set(seed.entries.map((entry) => entry.text.toLowerCase()));
  const descriptors = readDescriptors();
  const suggestions = descriptors.map((word) => suggest(word, seeded));

  const counts = suggestions.reduce<Record<string, number>>(
    (totals, suggestion) => {
      totals[suggestion.role] = (totals[suggestion.role] ?? 0) + 1;
      return totals;
    },
    {}
  );

  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        description:
          "Machine suggestions for every word in the v1 DESCRIPTORS list (src/v1/parser.peggy). Not loaded anywhere: reviewed choices live in modifiers.seed.json. Regenerate with `yarn workspace @peas/parser extract:descriptors`.",
        counts,
        inSeed: suggestions.filter((suggestion) => suggestion.inSeed).length,
        suggestions,
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    `Wrote ${suggestions.length} suggestions to ${outputPath}`,
    counts
  );
}

main();

import type { Quantity } from "../ast/types.js";
import type { Lexicon } from "../lexicon/token-trie.js";
import { parseLineBest } from "../parse-line.js";

/**
 * Imperative cooking verbs in their base form. "Roasted peppers" and "chopped parsley" start with participles, which are not here, so preparation descriptors never read as steps.
 */
const COOKING_VERBS = new Set([
  "add",
  "adjust",
  "allow",
  "arrange",
  "assemble",
  "bake",
  "baste",
  "beat",
  "blanch",
  "blend",
  "boil",
  "braise",
  "bring",
  "broil",
  "brush",
  "chill",
  "chop",
  "coat",
  "combine",
  "cook",
  "cover",
  "crush",
  "cut",
  "deglaze",
  "dice",
  "discard",
  "dissolve",
  "divide",
  "drain",
  "drizzle",
  "fill",
  "flip",
  "fold",
  "freeze",
  "fry",
  "grate",
  "grease",
  "grill",
  "grind",
  "halve",
  "heat",
  "insert",
  "knead",
  "ladle",
  "layer",
  "leave",
  "let",
  "line",
  "marinate",
  "mash",
  "measure",
  "melt",
  "microwave",
  "mix",
  "place",
  "poach",
  "pour",
  "preheat",
  "prepare",
  "press",
  "process",
  "pulse",
  "puree",
  "purée",
  "put",
  "reduce",
  "refrigerate",
  "reheat",
  "remove",
  "repeat",
  "reserve",
  "rest",
  "return",
  "rinse",
  "roll",
  "saute",
  "sauté",
  "scatter",
  "scoop",
  "scrape",
  "sear",
  "season",
  "serve",
  "set",
  "shake",
  "shape",
  "shred",
  "sift",
  "simmer",
  "skim",
  "soak",
  "spoon",
  "spread",
  "sprinkle",
  "squeeze",
  "steam",
  "stir",
  "store",
  "strain",
  "stuff",
  "taste",
  "thicken",
  "toss",
  "transfer",
  "trim",
  "turn",
  "use",
  "wash",
  "whisk",
  "wipe",
  "wrap",
  "make",
  "keep",
  "check",
  "flatten",
  "pound",
  "lower",
  "lift",
]);

/** Words that are verbs only when an object or adverb follows ("Zest the lemon", "Top with cheese"); otherwise they usually start a food ("Zest and juice of 1 orange", "Brown sugar"). */
const AMBIGUOUS_VERBS = new Set([
  "brown",
  "bread",
  "brine",
  "butter",
  "core",
  "cream",
  "crumble",
  "cool",
  "double",
  "dry",
  "dust",
  "flour",
  "garnish",
  "glaze",
  "ice",
  "juice",
  "mince",
  "oil",
  "peel",
  "pepper",
  "pit",
  "quarter",
  "roast",
  "rub",
  "salt",
  "seed",
  "slice",
  "split",
  "stem",
  "toast",
  "top",
  "warm",
  "whip",
  "zest",
]);

/** Compound verbs; any other hyphenated word ("store-bought", "cut-up") is read as a description. */
const HYPHENATED_VERBS = new Set([
  "stir-fry",
  "deep-fry",
  "pan-fry",
  "pan-sear",
  "pan-roast",
  "dry-age",
  "dry-brine",
  "double-check",
  "air-fry",
  "slow-cook",
  "pressure-cook",
]);

const OBJECT_WORDS = new Set([
  "the",
  "a",
  "an",
  "it",
  "them",
  "each",
  "all",
  "both",
  "with",
  "generously",
  "lightly",
  "well",
  "evenly",
  "liberally",
  "your",
  "this",
  "these",
  "those",
  "over",
  "until",
  "in",
  "on",
  "into",
]);

const STEP_OPENERS = [
  "in a",
  "in the",
  "in another",
  "meanwhile",
  "when",
  "once",
  "while",
  "after",
  "before",
  "then",
  "using",
  "to make",
  "to prepare",
  "next",
  "finally",
  "first",
  "if",
  "working in batches",
  "on a",
  "into a",
  "with a",
  "with the",
  "at this point",
  "repeat",
];

/** Whole lines that name a part of a recipe rather than a food (compared without case or a trailing colon). */
const HEADING_WORDS = new Set([
  "garnish",
  "garnishes",
  "to garnish",
  "to serve",
  "for serving",
  "to finish",
  "topping",
  "toppings",
  "filling",
  "sauce",
  "marinade",
  "dressing",
  "glaze",
  "crust",
  "dough",
  "pastry",
  "frosting",
  "icing",
  "batter",
  "assembly",
  "to assemble",
  "optional",
  "optional garnish",
  "optional toppings",
  "spice rub",
  "rub",
  "brine",
  "streusel",
  "crumb topping",
  "syrup",
  "salsa",
  "ingredients",
  "method",
  "directions",
  "instructions",
  "preparation",
  "equipment",
  "garnish (optional)",
]);

const NOTE_MARKER =
  /^(?:notes?|tips?|cook'?s notes?|variations?|make[- ]ahead|to make ahead|storage|substitutions?|n\.?b\.?)\s*[:.\-–—]/iu;
const YIELD =
  /^(?:serves|serving|servings|makes|yield|yields|portions|(?:prep|cook|cooking|total|active) time|adapted from|source|recipe from)\b[:\s]+\S/iu;
const URL = /^(?:https?:\/\/|www\.)\S+$/iu;
const NUMBERED_STEP =
  /^(?:step\s*\d{1,2}\s*[:.)]?|\d{1,2}\s*[.)])\s+(?=\p{L})/iu;
const LEADING_BULLETS = /^[\s•·*\-–—▪◦●]+/u;
const TEMPERATURE =
  /\b\d{2,3}\s*(?:°|º|˚|degrees?\b)\s*(?:f\b|c\b|fahrenheit|celsius)?|\b(?:low|medium|medium[- ]low|medium[- ]high|high)\s+heat\b/iu;
const DURATION =
  /\b(?:\d+(?:\s*(?:-|–|to)\s*\d+)?|a few|several|a couple of)\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?)\b|\bovernight\b/iu;
const UNTIL = /\buntil\b/iu;
const INGREDIENT_NOTE =
  /\b(?:to taste|as needed|divided|optional|plus more|or more|at room temperature|for (?:garnish|garnishing|serving|drizzling|dusting|frying|greasing|brushing|sprinkling|the pan))\b/iu;
const FOR_THE_HEADING = /^for\s+(?:the\s+)?\p{L}[\p{L}\s'’&-]{0,40}?\s*:?$/iu;
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/**
 * What the classifier knows about one line: its shape, its first words, and what the ingredient parser made of it.
 *
 * @example
 * blockFeatures("Preheat the oven to 400 degrees.")
 * // { leadingVerb: "preheat", temperature: "400 degrees", sentenceCount: 1, endsWithPeriod: true, leadingQuantity: null, ... }
 */
export interface BlockFeatures {
  wordCount: number;
  sentenceCount: number;
  endsWithPeriod: boolean;
  endsWithColon: boolean;
  allCaps: boolean;
  parenthesized: boolean;
  numberedStep: boolean;
  leadingVerb: string | null;
  leadingOpener: string | null;
  leadingQuantity: Quantity["kind"] | null;
  hasUnit: boolean;
  unspecifiedAmount: boolean;
  ingredientNote: string | null;
  foodLexemeCount: number;
  temperature: string | null;
  duration: string | null;
  hasUntil: boolean;
  /** "For the sauce" or "For the sauce:" as the whole line. */
  forTheHeading: boolean;
  /** The whole line is a heading word such as "Garnish" or "To serve". */
  headingWord: string | null;
  noteMarker: string | null;
  yieldOrSource: string | null;
  url: boolean;
}

export interface BlockFeatureOptions {
  /** Lets known foods count as evidence; without it the classifier still works on structure alone. */
  lexicon?: Lexicon;
}

function quantityHasUnit(quantity: Quantity): boolean {
  switch (quantity.kind) {
    case "EXACT":
    case "RANGE":
    case "UNSPECIFIED":
      return quantity.unit !== undefined;
    case "PACKAGE":
      return (
        quantity.packageType !== undefined ||
        (quantity.packageSize !== undefined &&
          quantityHasUnit(quantity.packageSize))
      );
    case "APPROXIMATE":
      return quantityHasUnit(quantity.quantity);
    case "MEASURE_RANGE":
      return quantityHasUnit(quantity.from) || quantityHasUnit(quantity.to);
    case "ALTERNATIVE":
      return quantity.options.some(quantityHasUnit);
    case "SUM":
      return quantity.parts.some(quantityHasUnit);
  }
}

function words(text: string): string[] {
  return [...text.matchAll(WORD)].map((match) => match[0].toLowerCase());
}

function countSentences(text: string): number {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}])/u)
    .filter((sentence) => words(sentence).length >= 3);
  return Math.max(1, sentences.length);
}

/** "Mix of greens" and "Rest of the butter" are nouns, whatever the first word. */
function isVerb(word: string, next: string | undefined): boolean {
  if (next === "of") return false;
  if (COOKING_VERBS.has(word) || HYPHENATED_VERBS.has(word)) return true;
  return (
    AMBIGUOUS_VERBS.has(word) && next !== undefined && OBJECT_WORDS.has(next)
  );
}

function leadingOpener(lower: string): string | null {
  return (
    STEP_OPENERS.find(
      (opener) =>
        lower.startsWith(opener) &&
        !/[\p{L}]/u.test(lower.charAt(opener.length))
    ) ?? null
  );
}

function headingKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s*:\s*$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Reads the evidence in one line of note content. Leading bullets and step numbers are set aside before the first word is read.
 *
 * @example
 * blockFeatures("2 tbsp olive oil").leadingQuantity     // "EXACT"
 * blockFeatures("Roasted peppers").leadingVerb          // null (a participle, not a step)
 * blockFeatures("Zest the lemon").leadingVerb           // "zest"
 * blockFeatures("Zest and juice of 1 orange").leadingVerb // null
 */
export function blockFeatures(
  raw: string,
  { lexicon }: BlockFeatureOptions = {}
): BlockFeatures {
  const trimmed = raw.trim();
  const numberedStep = NUMBERED_STEP.test(trimmed);
  const text = trimmed.replace(NUMBERED_STEP, "").replace(LEADING_BULLETS, "");
  const lower = text.toLowerCase();
  const allWords = words(text);
  const [first, second] = allWords;
  const letters = text.replace(/[^\p{L}]/gu, "");

  const syntax = parseLineBest(text, { lexicon });
  const firstQuantity = syntax.segments[0]?.quantity;
  const leadingQuantity =
    firstQuantity && firstQuantity.span.start <= 1 ? firstQuantity : undefined;
  const key = headingKey(text);

  return {
    wordCount: allWords.length,
    sentenceCount: countSentences(text),
    endsWithPeriod: /[.!]\s*$/u.test(text),
    endsWithColon: /:\s*$/u.test(text),
    allCaps:
      letters.length >= 3 &&
      letters === letters.toUpperCase() &&
      letters !== letters.toLowerCase(),
    parenthesized: /^\(.*\)$/su.test(text),
    numberedStep,
    leadingVerb: first !== undefined && isVerb(first, second) ? first : null,
    leadingOpener: leadingOpener(lower),
    leadingQuantity: leadingQuantity?.kind ?? null,
    hasUnit: leadingQuantity ? quantityHasUnit(leadingQuantity) : false,
    unspecifiedAmount: syntax.segments.some(
      (segment) => segment.quantity?.kind === "UNSPECIFIED"
    ),
    ingredientNote: INGREDIENT_NOTE.exec(text)?.[0] ?? null,
    foodLexemeCount: syntax.segments
      .flatMap((segment) => segment.phrase)
      .filter((item) => item.kind === "LEXEME" && item.roles.includes("FOOD"))
      .length,
    temperature: TEMPERATURE.exec(text)?.[0] ?? null,
    duration: DURATION.exec(text)?.[0] ?? null,
    hasUntil: UNTIL.test(text),
    forTheHeading: FOR_THE_HEADING.test(text),
    headingWord: HEADING_WORDS.has(key) ? key : null,
    noteMarker: NOTE_MARKER.exec(text)?.[0] ?? null,
    yieldOrSource: YIELD.exec(text)?.[0] ?? null,
    url: URL.test(text),
  };
}

/** "For the sauce: Combine…" or "Garnish: chopped parsley": a heading label glued to the start of a line. */
const LEADING_HEADING =
  /^((?:for\s+(?:the\s+)?|to\s+make\s+(?:the\s+)?)[^:.]{1,40}|[\p{L} ()]{3,30}):\s*(\S.*)$/iu;

/** Labels that mark a single line rather than open a section ("Optional: 1 tsp chili flakes"). */
const LINE_LABELS = new Set(["optional"]);

/**
 * Where a heading label at the start of a line ends, when more text follows it. Generic labels count only when they are a known heading word, so "Note: …" and "Tip: …" stay notes, and "Optional: …" stays part of its line.
 *
 * @example
 * leadingHeading("For the Cumberland sauce: Combine all the ingredients")
 * // { heading: "For the Cumberland sauce:", rest: "Combine all the ingredients", restStart: 26 }
 * leadingHeading("Note: can be made ahead") // null
 */
export function leadingHeading(
  raw: string
): { heading: string; rest: string; restStart: number } | null {
  const text = raw.trim();
  const match = LEADING_HEADING.exec(text);
  if (!match?.[1] || !match[2]) return null;
  const label = match[1];
  const isForThe = /^(?:for|to\s+make)\s/iu.test(label);
  const key = headingKey(label);
  if (LINE_LABELS.has(key)) return null;
  if (!isForThe && !HEADING_WORDS.has(key)) return null;
  const restStart = text.length - match[2].length;
  return {
    heading: text.slice(0, restStart).trim(),
    rest: match[2],
    restStart,
  };
}

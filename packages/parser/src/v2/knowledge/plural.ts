const IRREGULAR: Readonly<Record<string, string>> = {
  leaf: "leaves",
  loaf: "loaves",
  half: "halves",
  knife: "knives",
  calf: "calves",
  tomato: "tomatoes",
  potato: "potatoes",
  mango: "mangoes",
  hero: "heroes",
  child: "children",
  goose: "geese",
  mouse: "mice",
  tooth: "teeth",
  foot: "feet",
};

/** Mass nouns that recipes never pluralize; generating "flours" would only add noise to the lexicon. */
const UNCOUNTABLE = new Set([
  "flour",
  "sugar",
  "salt",
  "rice",
  "milk",
  "water",
  "butter",
  "oil",
  "cream",
  "honey",
  "broth",
  "stock",
  "vinegar",
  "pepper",
  "cheese",
  "bread",
  "garlic",
  "parsley",
  "cilantro",
  "basil",
  "thyme",
  "oregano",
  "rosemary",
  "dill",
  "mint",
  "sage",
  "fish",
  "meat",
  "pork",
  "beef",
  "lamb",
  "chicken",
  "juice",
  "zest",
  "yeast",
]);

/**
 * A generated English plural for a lexicon phrase, changing only the last word; null when the phrase already looks plural or is a mass noun. Plurals are stored as explicit PLURAL entries (the matcher has no morphology), so this only runs when a reviewer creates or maps a phrase.
 *
 * @example
 * generatePlural("chicken thigh")   // "chicken thighs"
 * generatePlural("cherry tomato")   // "cherry tomatoes"
 * generatePlural("berry")           // "berries"
 * generatePlural("bay leaf")        // "bay leaves"
 * generatePlural("radishes")        // null (already plural)
 * generatePlural("all-purpose flour") // null (mass noun)
 */
export function generatePlural(phrase: string): string | null {
  const trimmed = phrase.trim();
  const match = /^(.*?)([\p{L}]+)$/u.exec(trimmed);
  if (!match) return null;
  const prefix = match[1] ?? "";
  const word = match[2] ?? "";
  const lower = word.toLowerCase();
  if (UNCOUNTABLE.has(lower)) return null;

  const irregular = IRREGULAR[lower];
  if (irregular) return prefix + matchCase(word, irregular);
  if (lower.endsWith("s") && !lower.endsWith("ss")) return null;

  let plural: string;
  if (/(s|x|z|ch|sh)$/.test(lower)) plural = `${word}es`;
  else if (/[^aeiou]y$/.test(lower)) plural = `${word.slice(0, -1)}ies`;
  else plural = `${word}s`;
  return prefix + plural;
}

function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase())
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

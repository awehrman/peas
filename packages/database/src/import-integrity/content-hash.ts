import { createHash } from "node:crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Whitespace-, case-, and Unicode-insensitive text, so re-exports that only differ in formatting hash the same.
 *
 * @example
 * normalizeForHash("  2 Cups\u00a0Flour ") // "2 cups flour"
 */
export function normalizeForHash(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * SHA-256 of the HTML exactly as uploaded: the same file imported twice.
 *
 * @example
 * computeRawHtmlHash("<en-note>...</en-note>") // "3f1c..."
 */
export function computeRawHtmlHash(html: string): string {
  return sha256(html);
}

export interface HashableNoteContent {
  title: string | null;
  ingredientLines: readonly string[];
  instructionLines: readonly string[];
}

/**
 * SHA-256 of the normalized title, ingredient lines, and instructions, in order. Null when there is nothing to compare, so empty notes never match each other.
 *
 * @example
 * computeContentHash({ title: "Soup", ingredientLines: ["1 onion"], instructionLines: ["Simmer."] }) // "9a0e..."
 */
export function computeContentHash(content: HashableNoteContent): string | null {
  const ingredients = content.ingredientLines.map(normalizeForHash).filter(Boolean);
  const instructions = content.instructionLines.map(normalizeForHash).filter(Boolean);
  if (ingredients.length === 0 && instructions.length === 0) return null;
  return sha256(
    JSON.stringify({
      title: normalizeForHash(content.title ?? ""),
      ingredients,
      instructions,
    })
  );
}

/**
 * Normalized source text used as an identity for non-URL sources and as the book-lookup cache key. Folds accents, case, quotes, and punctuation runs.
 *
 * @example
 * normalizeSourceText("  The Joy of Cooking — 75th Anniversary ") // "the joy of cooking 75th anniversary"
 */
export function normalizeSourceText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

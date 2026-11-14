import type { ClassificationKind, ClassificationValue } from "./types";

export const CLASSIFICATION_KIND_LABELS: Record<ClassificationKind, string> = {
  DIETARY: "dietary property",
  FOOD_GROUP: "food group",
  ALLERGEN: "allergen",
  CATEGORY: "category",
  CERTIFICATION: "certification",
};
export const CLASSIFICATION_KINDS = Object.keys(
  CLASSIFICATION_KIND_LABELS
) as ClassificationKind[];

export const CLASSIFICATION_VALUE_LABELS: Record<ClassificationValue, string> =
  {
    TRUE: "yes",
    FALSE: "no",
    UNKNOWN: "unknown",
  };
export const CLASSIFICATION_VALUES = Object.keys(
  CLASSIFICATION_VALUE_LABELS
) as ClassificationValue[];

/**
 * The stored key for a classification typed into the form: categories keep their spelling behind a CATEGORY: prefix, other keys become upper snake case.
 *
 * @example
 * classificationKey("CATEGORY", "Baking Spices") // "CATEGORY:Baking Spices"
 * classificationKey("DIETARY", "gluten free")    // "GLUTEN_FREE"
 */
export function classificationKey(
  kind: ClassificationKind,
  text: string
): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return kind === "CATEGORY"
    ? `CATEGORY:${trimmed}`
    : trimmed.toUpperCase().replace(/[\s-]+/g, "_");
}

/** "CATEGORY:Spices" reads as "Spices"; "GLUTEN_FREE" as "gluten free". */
export function classificationLabel(key: string): string {
  return key.startsWith("CATEGORY:")
    ? key.slice("CATEGORY:".length)
    : key.replace(/_/g, " ").toLowerCase();
}

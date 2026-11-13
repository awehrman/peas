import type {
  ClassificationKind,
  FoodRelationshipType,
  TriState,
} from "./types.js";

/**
 * Which classification kinds flow from a target concept to its source across each relationship type (decision D15). Certifications and product claims never inherit.
 *
 * @example
 * // "chicken thigh" PART_OF "chicken": the thigh inherits chicken's food group (POULTRY) and allergens, not its category
 */
export const INHERITANCE_RULES: Readonly<
  Record<FoodRelationshipType, readonly ClassificationKind[]>
> = {
  IS_A: ["FOOD_GROUP", "DIETARY", "ALLERGEN", "CATEGORY"],
  PART_OF: ["FOOD_GROUP", "ALLERGEN"],
  DERIVED_FROM: ["FOOD_GROUP", "ALLERGEN"],
  PROCESSED_FROM: ["FOOD_GROUP", "ALLERGEN"],
};

/** Kinds that inherit along a whole path: the intersection of each edge's rule. */
export function inheritableKinds(
  path: readonly FoodRelationshipType[]
): ClassificationKind[] {
  const [first, ...rest] = path;
  if (!first) return [];
  return INHERITANCE_RULES[first].filter((kind) =>
    rest.every((type) => INHERITANCE_RULES[type].includes(kind))
  );
}

export interface ClassificationValue {
  kind: ClassificationKind;
  key: string;
  value: TriState;
}

/**
 * An ancestor reached from the concept, with the relationship types along the way (nearest edge first).
 *
 * @example
 * // from "chicken thigh": chicken via [PART_OF], poultry via [PART_OF, IS_A]
 * { conceptId: "<poultry id>", path: ["PART_OF", "IS_A"], classifications: [{ kind: "FOOD_GROUP", key: "POULTRY", value: "TRUE" }] }
 */
export interface AncestorClassifications {
  conceptId: string;
  path: FoodRelationshipType[];
  classifications: ClassificationValue[];
}

export type EffectiveClassification = ClassificationValue &
  (
    | { source: "EXPLICIT" }
    | {
        source: "INHERITED";
        inheritedFromConceptId: string;
        path: FoodRelationshipType[];
      }
    | { source: "CONFLICT"; conflictingConceptIds: string[] }
  );

/**
 * Computes a concept's classifications at read time.
 *
 * - Explicit values on the concept always win.
 * - Otherwise the nearest ancestor (shortest path) whose path allows the kind supplies the value.
 * - At equal distance, TRUE or FALSE beats UNKNOWN; disagreeing definite values produce UNKNOWN with source CONFLICT so a reviewer can settle it.
 *
 * @example
 * // "buttermilk" DERIVED_FROM "milk" (DAIRY TRUE, ALLERGEN_MILK TRUE)
 * effectiveClassifications([], [{ conceptId: milk, path: ["DERIVED_FROM"], classifications: [...] }])
 * // -> DAIRY and ALLERGEN_MILK TRUE (INHERITED from milk); milk's category is not inherited across DERIVED_FROM
 */
export function effectiveClassifications(
  explicit: readonly ClassificationValue[],
  ancestors: readonly AncestorClassifications[]
): EffectiveClassification[] {
  const result = new Map<string, EffectiveClassification>();
  for (const classification of explicit) {
    result.set(classification.key, { ...classification, source: "EXPLICIT" });
  }

  const candidatesByKey = new Map<
    string,
    { ancestor: AncestorClassifications; value: ClassificationValue }[]
  >();
  for (const ancestor of ancestors) {
    const allowed = inheritableKinds(ancestor.path);
    for (const value of ancestor.classifications) {
      if (result.has(value.key) || !allowed.includes(value.kind)) continue;
      const list = candidatesByKey.get(value.key) ?? [];
      list.push({ ancestor, value });
      candidatesByKey.set(value.key, list);
    }
  }

  for (const [key, candidates] of candidatesByKey) {
    const nearestDepth = Math.min(
      ...candidates.map((candidate) => candidate.ancestor.path.length)
    );
    const nearest = candidates.filter(
      (candidate) => candidate.ancestor.path.length === nearestDepth
    );
    const definite = nearest.filter(
      (candidate) => candidate.value.value !== "UNKNOWN"
    );
    const definiteValues = new Set(
      definite.map((candidate) => candidate.value.value)
    );
    const first = nearest[0];
    if (!first) continue;

    if (definiteValues.size > 1) {
      result.set(key, {
        kind: first.value.kind,
        key,
        value: "UNKNOWN",
        source: "CONFLICT",
        conflictingConceptIds: definite.map(
          (candidate) => candidate.ancestor.conceptId
        ),
      });
      continue;
    }

    const chosen = definite[0] ?? first;
    result.set(key, {
      ...chosen.value,
      source: "INHERITED",
      inheritedFromConceptId: chosen.ancestor.conceptId,
      path: chosen.ancestor.path,
    });
  }

  return [...result.values()].sort((a, b) => a.key.localeCompare(b.key));
}

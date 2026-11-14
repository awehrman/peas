import { optionalEnum, optionalFlag, optionalText } from "./search";
import type { FoodRelationshipType } from "~/graphql/generated";

import {
  type ConceptGraphOptions,
  type ConceptOccurrenceFilters,
  GRAPH_RELATIONSHIP_TYPES,
} from "@peas/features";
import { z } from "zod";

/** Every relationship type: the expansion the "Include foods made from it" switch asks for. */
export const WITH_MADE_FROM: FoodRelationshipType[] = [
  "IS_A",
  "PART_OF",
  "DERIVED_FROM",
  "PROCESSED_FROM",
];

/** `/concepts/$id/usage` search params; malformed values fall back to no filter. */
export const occurrenceSearchSchema = z.object({
  madeFrom: optionalFlag,
  review: optionalFlag,
  prep: optionalText,
  attr: optionalText,
  source: optionalText,
  category: optionalText,
  status: optionalEnum(["AUTO_RESOLVED", "VERIFIED", "NEEDS_REVIEW"] as const),
});
export type OccurrenceSearch = z.infer<typeof occurrenceSearchSchema>;

/**
 * The occurrence page's filters from its URL. A waiting-for-review status only counts while those mentions are included.
 *
 * @example
 * toOccurrenceFilters({ prep: "dice", status: "NEEDS_REVIEW" }) // { includeMadeFrom: false, includeNeedsReview: false, preparationKey: "dice", status: undefined, ... }
 */
export function toOccurrenceFilters(
  search: OccurrenceSearch
): ConceptOccurrenceFilters {
  return {
    includeMadeFrom: search.madeFrom === true,
    includeNeedsReview: search.review === true,
    preparationKey: search.prep,
    attribute: search.attr,
    sourceId: search.source,
    categoryId: search.category,
    status:
      search.status === "NEEDS_REVIEW" && !search.review
        ? undefined
        : search.status,
  };
}

/**
 * @example
 * toOccurrenceSearch({ includeMadeFrom: true, includeNeedsReview: false, attribute: "bone:boneless" }) // { madeFrom: true, review: undefined, attr: "bone:boneless", ... }
 */
export function toOccurrenceSearch(
  filters: ConceptOccurrenceFilters
): OccurrenceSearch {
  return {
    madeFrom: filters.includeMadeFrom || undefined,
    review: filters.includeNeedsReview || undefined,
    prep: filters.preparationKey,
    attr: filters.attribute,
    source: filters.sourceId,
    category: filters.categoryId,
    status: filters.status,
  };
}

/** `/concepts/$id/graph` search params. `types` is comma-separated; absent means all four. */
export const graphSearchSchema = z.object({
  depth: z.coerce.number().int().min(1).max(3).optional().catch(undefined),
  types: optionalText,
  dir: optionalEnum(["UP", "DOWN", "BOTH"] as const),
});
export type GraphSearch = z.infer<typeof graphSearchSchema>;

/**
 * @example
 * toGraphOptions({ types: "IS_A,PART_OF", dir: "UP" }) // { depth: 2, types: ["IS_A", "PART_OF"], direction: "UP" }
 */
export function toGraphOptions(search: GraphSearch): ConceptGraphOptions {
  const types =
    search.types === undefined
      ? [...GRAPH_RELATIONSHIP_TYPES]
      : GRAPH_RELATIONSHIP_TYPES.filter((type) =>
          search.types?.split(",").includes(type)
        );
  return { depth: search.depth ?? 2, types, direction: search.dir ?? "BOTH" };
}

/**
 * Defaults stay out of the URL; turning every type off is kept as "none".
 *
 * @example
 * toGraphSearch({ depth: 2, types: ["IS_A"], direction: "BOTH" }) // { depth: undefined, types: "IS_A", dir: undefined }
 */
export function toGraphSearch(options: ConceptGraphOptions): GraphSearch {
  const allTypes = options.types.length === GRAPH_RELATIONSHIP_TYPES.length;
  return {
    depth: options.depth === 2 ? undefined : options.depth,
    types: allTypes ? undefined : options.types.join(",") || "none",
    dir: options.direction === "BOTH" ? undefined : options.direction,
  };
}

/**
 * @example
 * graphSearchString({ depth: 3, types: "IS_A", dir: undefined }) // "?depth=3&types=IS_A"
 */
export function graphSearchString(search: GraphSearch): string {
  const params = new URLSearchParams();
  if (search.depth) params.set("depth", String(search.depth));
  if (search.types) params.set("types", search.types);
  if (search.dir) params.set("dir", search.dir);
  const query = params.toString();
  return query ? `?${query}` : "";
}

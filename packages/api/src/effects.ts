import { z } from "zod";

/**
 * Query areas a mutation can make stale. Must match the InvalidationDomain
 * enum in schema.graphql (asserted by the schema tests).
 */
export const INVALIDATION_DOMAINS = [
  "NOTES",
  "NOTE_DETAIL",
  "RECIPES",
  "RECIPE_DETAIL",
  "RECIPE_TAXONOMY",
  "IMPORT_STATS",
  "DASHBOARD_STATS",
  "DISCOVERIES",
  "CONCEPTS",
  "CONCEPT_DETAIL",
  "MENTIONS",
  "CORPUS_HEALTH",
  "IMPORT_REVIEW",
  "CATEGORIES",
  "STRUCTURE_REVIEW",
] as const;

export type InvalidationDomain = (typeof INVALIDATION_DOMAINS)[number];

/** Domains whose results depend on parser output and therefore on the lexicon. */
export const REVISION_SENSITIVE_DOMAINS: readonly InvalidationDomain[] = [
  "NOTE_DETAIL",
  "RECIPE_DETAIL",
  "DASHBOARD_STATS",
  "DISCOVERIES",
  "CONCEPTS",
  "CONCEPT_DETAIL",
  "MENTIONS",
  "CORPUS_HEALTH",
];

/** Everything a Teach Peas decision can make stale. */
export const KNOWLEDGE_DOMAINS: readonly InvalidationDomain[] = [
  "CATEGORIES",
  "DISCOVERIES",
  "CONCEPTS",
  "CONCEPT_DETAIL",
  "MENTIONS",
  "NOTE_DETAIL",
  "RECIPES",
  "RECIPE_DETAIL",
  "DASHBOARD_STATS",
  "CORPUS_HEALTH",
];

/** Domains refreshed when a background reprocessing job finishes. */
export const JOB_COMPLETION_DOMAINS: readonly InvalidationDomain[] = [
  "CATEGORIES",
  "NOTES",
  "NOTE_DETAIL",
  "RECIPES",
  "RECIPE_DETAIL",
  "IMPORT_STATS",
  "DASHBOARD_STATS",
  "DISCOVERIES",
  "CONCEPTS",
  "CONCEPT_DETAIL",
  "MENTIONS",
  "CORPUS_HEALTH",
];

export const MAX_EFFECT_REFS = 100;

/**
 * A normalized-cache identity.
 *
 * @example
 * { typename: "Recipe", id: "cm3r..." } // Apollo cache id "Recipe:cm3r..."
 */
export const entityRefSchema = z.object({
  typename: z.string().min(1),
  id: z.string().min(1),
});

/**
 * What a mutation changed beyond the entities in its payload.
 *
 * @example
 * // updateRecipe renamed "Chili" to "Weeknight Chili"
 * {
 *   changed: [{ typename: "Recipe", id: "cm3r..." }],          // evicted so the open recipe refetches
 *   evicted: [],                                             // nothing was deleted or merged away
 *   invalidatedDomains: ["RECIPES", "RECIPE_TAXONOMY"],       // the list and filter menus show it
 *   lexiconRevision: null,                                   // set by Teach Peas decisions (Phase 4)
 *   reprocessingJobId: null,                                 // set when lines are re-parsed in the background
 * }
 */
export const mutationEffectSchema = z.object({
  changed: z.array(entityRefSchema).max(MAX_EFFECT_REFS),
  evicted: z.array(entityRefSchema).max(MAX_EFFECT_REFS),
  invalidatedDomains: z.array(z.enum(INVALIDATION_DOMAINS)),
  lexiconRevision: z.number().int().nonnegative().nullable(),
  reprocessingJobId: z.string().min(1).nullable(),
});

export type EntityRef = z.infer<typeof entityRefSchema>;
export type MutationEffect = z.infer<typeof mutationEffectSchema>;

export interface MutationEffectInput {
  changed?: EntityRef[];
  evicted?: EntityRef[];
  invalidatedDomains?: InvalidationDomain[];
  lexiconRevision?: number | null;
  reprocessingJobId?: string | null;
}

/**
 * Builds a bounded effect. Duplicate refs and domains are dropped; when a ref
 * list exceeds the cap it is truncated and `overflowDomains` are added so the
 * client still refreshes everything that may hold the omitted entities.
 *
 * @example
 * createMutationEffect({ changed: [{ typename: "Recipe", id }], invalidatedDomains: ["RECIPES"] })
 *
 * @example
 * // 250 changed lines: only the first 100 refs are sent, and NOTE_DETAIL is added
 * createMutationEffect({ changed: lineRefs }, ["NOTE_DETAIL"])
 */
export function createMutationEffect(
  input: MutationEffectInput = {},
  overflowDomains: InvalidationDomain[] = []
): MutationEffect {
  const changed = uniqueRefs(input.changed ?? []);
  const evicted = uniqueRefs(input.evicted ?? []);
  const domains = new Set(input.invalidatedDomains ?? []);

  if (changed.length > MAX_EFFECT_REFS || evicted.length > MAX_EFFECT_REFS) {
    for (const domain of overflowDomains) domains.add(domain);
  }

  return mutationEffectSchema.parse({
    changed: changed.slice(0, MAX_EFFECT_REFS),
    evicted: evicted.slice(0, MAX_EFFECT_REFS),
    invalidatedDomains: INVALIDATION_DOMAINS.filter((domain) =>
      domains.has(domain)
    ),
    lexiconRevision: input.lexiconRevision ?? null,
    reprocessingJobId: input.reprocessingJobId ?? null,
  });
}

export const EMPTY_MUTATION_EFFECT: MutationEffect = createMutationEffect();

function uniqueRefs(refs: EntityRef[]): EntityRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.typename}:${ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

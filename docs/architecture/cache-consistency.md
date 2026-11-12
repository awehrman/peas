# Cache Consistency

Status (12 November 2026): M5 is implemented for today's domains (notes, recipes, ingredients, import stats) in `apps/web`; see the [M5 record](#m5-record-12-november-2026). The knowledge domains (concepts, lexicon, mentions, review queue) plug into the same coordinator when Phases 3 and 4 add their queries.

Peas is about to have many interconnected entities (concepts, terms, mentions, proposals, decisions, recipes). One ontology decision can change a concept page, alias lists, recipe ingredient lists, search results, review queues, and corpus statistics. The goal is normalized entity caching without spreading invalidation logic across components.

## Six separate consistency concerns

| Layer | Owner | Key | Invalidated by |
| --- | --- | --- | --- |
| Apollo normalized cache (browser) | Web app | `__typename:id` (immutable database ids) | Mutation results, mutation effects, revision change, job completion |
| GraphQL request-level caching (server) | GraphQL server | Per request only | End of request; never shared across users |
| Lexicon snapshots | Queue and GraphQL server processes | `LexiconRevision` | Revision bump (Redis publish plus a 15-second time limit) |
| Database | PostgreSQL via Prisma | n/a | Transactions; no ORM-level cache is assumed |
| Derived corpus aggregates | Database rows (e.g. corpus health snapshots) | Revision and parser version | Snapshot jobs after reinterpretation |
| Job state | BullMQ / Redis | Job id | Worker progress; surfaced through polling |

These must not be conflated: a fresh Apollo cache does not imply fresh mentions, and a bumped revision does not imply reinterpretation has finished.

The queue already follows two of these rules: parse-cache keys include the parser id, and Phase 5 adds the lexicon revision to them.

## Cache identity

- Type policies key `FoodConcept`, `FoodTerm` (lexicon entry), `IngredientMention`, `KnowledgeProposal` (discovery), `KnowledgeDecision`, and `Recipe` by their immutable `id`.
- Names and slugs are never cache keys.
- Merged concepts are evicted by id and their references re-pointed to the survivor id returned by the merge mutation.

## Mutation effect contract

Every knowledge mutation returns a bounded effect description:

```ts
export const INVALIDATION_DOMAINS = [
  "CONCEPT_DETAIL",
  "CONCEPT_LIST",
  "LEXICON",
  "MENTIONS",
  "REVIEW_QUEUE",
  "CORPUS_HEALTH",
  "RECIPES",
] as const;
export type InvalidationDomain = (typeof INVALIDATION_DOMAINS)[number];

export interface KnowledgeMutationEffect {
  lexiconRevision: number;
  changedConceptIds: string[]; // capped; larger changes rely on domains
  changedTermIds: string[];
  changedMentionIds: string[]; // capped
  evictedConceptIds: string[]; // merged or deprecated identities
  invalidatedDomains: InvalidationDomain[];
  reprocessingJobId?: string;
}
```

- The union is validated with Zod at the GraphQL boundary.
- Id lists are capped (e.g. 100). Beyond the cap, the client relies on `invalidatedDomains`, the new revision, and the job id.

## Centralized reconciliation

A single cache coordinator in the web app (not individual components):

1. Writes returned entities into the normalized cache.
2. Evicts `evictedConceptIds` and garbage-collects.
3. Refetches active queries registered for each invalidated domain.
4. Reconciles paginated lists (review queue, concept lists) by refetching the affected page rather than splicing locally.
5. Records the latest `lexiconRevision`; any response carrying an older revision for revision-sensitive fields triggers a refetch.
6. Tracks `reprocessingJobId` and, on completion, invalidates `MENTIONS`, `RECIPES`, and `CORPUS_HEALTH`.

## Eventual consistency in the UI

The UI distinguishes, for every decision:

- decision accepted
- reprocessing queued
- reprocessing running (with progress)
- reprocessing complete
- reprocessing failed (with retry)

Background jobs are polled while active. Subscriptions or server-sent events are considered only if polling proves insufficient.

## Optimistic updates

- Allowed for simple, local edits (renaming a concept, editing a description, deferring a discovery).
- Not used for merges, decisions with background reprocessing, or anything whose result depends on server-side reinterpretation. Completion of background work is never invented on the client.

## M5 record, 12 November 2026

### What exists

| Piece | Where | Notes |
| --- | --- | --- |
| Effect contract | `packages/api/src/effects.ts` and the `MutationEffect` type in `schema.graphql` | `changed` and `evicted` are generic `EntityRef { typename, id }` lists (capped at 100) instead of one id list per type; `invalidatedDomains`, `lexiconRevision`, `reprocessingJobId`. Zod-validated on the server (`createMutationEffect`) and again in the browser. A test keeps the TypeScript domain list and the GraphQL enum identical. |
| Cache identity | `apps/web/src/lib/apollo/cache-config.ts` | Every entity type is keyed by `id` (`Job` by `jobId`); value objects such as `EntityRef` and `MutationEffect` are never normalized. `note(id)`, `recipe(id)`, and `ingredient(id)` read through to cached entities. `possibleTypes` is generated from the schema. |
| Coordinator | `apps/web/src/lib/apollo/cache-coordinator.ts` | The only code that evicts or refetches. One per Apollo client (per request on the server, per tab in the browser). |
| Mutation adapter | `useMutationAction` in `cache-coordinator-provider.tsx` | Runs the mutation, returns `MutationResult` to feature components, and applies the payload's effect. |
| Job polling | `coordinator.trackJob` / `onJobUpdate` with the `job(jobId)` query | Polls every 2 seconds until COMPLETED, FAILED, CANCELLED, or missing; completion invalidates every parse-derived domain. |

### Today's domains

The design's knowledge domains (`CONCEPT_DETAIL`, `CONCEPT_LIST`, `LEXICON`, `MENTIONS`, `REVIEW_QUEUE`, `CORPUS_HEALTH`) are added when their queries exist. For now:

| Domain | Root fields dropped | Entities evicted |
| --- | --- | --- |
| `NOTES` | `notes` | `NoteSummary` |
| `NOTE_DETAIL` | `note` | `Note` |
| `RECIPES` | `recipes` | `RecipeSummary` |
| `RECIPE_DETAIL` | `recipe` | `Recipe` |
| `RECIPE_TAXONOMY` | `recipeTaxonomy` | none |
| `INGREDIENTS` | `ingredients`, `ingredientCounts`, `ingredientCategoryNames`, `searchIngredients` | `IngredientSummary` |
| `INGREDIENT_DETAIL` | `ingredient` | `Ingredient` |
| `IMPORT_STATS` | `importStats` | none |
| `DASHBOARD_STATS` | `dashboardStats` | none |

Detail domains evict their entity type as well as the root field, because the read-through field policies would otherwise keep serving the cached entity.

### How the coordinator applies an effect

1. Validates the effect with Zod. A malformed effect means nobody knows what changed, so every active query refetches.
2. Inside `client.refetchQueries({ updateCache })`: evicts each `changed` and `evicted` entity, drops the root fields and entity types of each invalidated domain, and garbage-collects. Apollo then refetches exactly the active queries the evictions touched; inactive queries refetch the next time they mount.
3. Records `lexiconRevision`. A newer revision also invalidates `NOTE_DETAIL`, `INGREDIENTS`, and `INGREDIENT_DETAIL` (parse-dependent views); an older one changes nothing.
4. Starts polling `reprocessingJobId`, if any.

Mutations that return the changed entity in their payload (`setLineReviewStatus` returns the refreshed `Note`) update every mounted view straight from Apollo's normalization, with an empty effect and no refetch.

Two related choices sit outside the coordinator: the default fetch policy is `cache-and-network` (imports change data without going through GraphQL mutations, so each navigation refreshes in the background), and optimistic updates are not used yet.

### Test coverage

`apps/web/src/lib/apollo/__tests__/cache-coordinator.test.ts` runs a real Apollo client and cache against a scripted link:

- a changed entity refetches the views showing it (the "renaming updates every mounted view" scenario, with a recipe);
- invalidated domains refetch active list queries and drop inactive detail data;
- unrelated queries are not refetched;
- a malformed effect refetches every active query;
- only a newer lexicon revision invalidates parse-dependent views (the "older revision does not overwrite newer data" scenario);
- a reprocessing job is polled to completion and then refreshes parse-derived views;
- a failed job is reported without invalidating anything (retry arrives with the Phase 4 reprocessing UI).

The merge, alias-approval, and reinterpretation scenarios below need the ontology mutations from Phases 3 and 4; they reuse the same coordinator.

## Test scenarios (M5)

- Renaming a concept updates every mounted view.
- Approving an alias updates the review queue count and affected mentions after the job completes.
- Merging concepts evicts the merged id with no dangling references.
- Recipe ingredient references update after reinterpretation.
- Filtered pagination is correct after a mutation removes an item.
- A failed background job surfaces and can be retried.
- A response stamped with an older revision does not overwrite newer data.

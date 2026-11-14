# Cache Consistency

Status (12 November 2026): M5 is implemented in `apps/web` for every domain (notes, recipes, import stats, dashboard, review queue, concepts, mentions, corpus health); see the [M5 record](#m5-record-12-november-2026). Phase 5 removed the legacy ingredient domains and added background reinterpretation through `reprocessingJobId`.

Peas is about to have many interconnected entities (concepts, terms, mentions, proposals, decisions, recipes). One ontology decision can change a concept page, alias lists, recipe ingredient lists, search results, review queues, and corpus statistics. The goal is normalized entity caching without spreading invalidation logic across components.

## Six separate consistency concerns

| Layer | Owner | Key | Invalidated by |
| --- | --- | --- | --- |
| Apollo normalized cache (browser) | Web app | `__typename:id` (immutable database ids) | Mutation results, mutation effects, revision change, job completion |
| GraphQL request-level caching (server) | GraphQL server | Per request only | End of request; never shared across users |
| Lexicon snapshots | Queue and GraphQL server processes | `LexiconRevision` | Revision bump (the API asks the queue to publish `lexicon:revision` on Redis; a 15-second time limit is the fallback) |
| Database | PostgreSQL via Prisma | n/a | Transactions; no ORM-level cache is assumed |
| Derived corpus aggregates | Computed on request (`corpusHealth`, `GET /metrics/ingredients`) | n/a | The `CORPUS_HEALTH` domain after decisions and job completion |
| Job state | BullMQ / Redis | Job id | Worker progress; surfaced through polling |

These must not be conflated: a fresh Apollo cache does not imply fresh mentions, and a bumped revision does not imply reinterpretation has finished.

The queue follows two of these rules: parse-cache keys include the parser version and the lexicon revision, and its resolver context is cached per revision (`apps/queue/src/services/ingredient/lexicon-cache.ts`).

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
| Job polling | `coordinator.trackJob` / `onJobUpdate` with the `job(jobId)` query | Polls every 2 seconds until COMPLETED, FAILED, CANCELLED, or missing; completion invalidates every parse-derived domain. Reinterpretation runs report `processedCount` and `totalCount`, which `useReinterpretProgress` turns into the banner on the Teach Peas pages. The provider resumes the coordinator when React re-runs its effect on the same instance; before that fix a cleanup left it disposed and job polls never started. |

### Today's domains

The knowledge domains joined with Phase 4 and `CORPUS_HEALTH` with Phase 5. The design named six (`CONCEPT_DETAIL`, `CONCEPT_LIST`, `LEXICON`, `MENTIONS`, `REVIEW_QUEUE`, `CORPUS_HEALTH`); five are needed (`DISCOVERIES` is the review queue, `CONCEPTS` the concept list). Phase 5 removed `INGREDIENTS` and `INGREDIENT_DETAIL` with the legacy ingredient queries; the concept-backed ingredient cards that replaced them, and the admin lexicon list, live in the existing domains: `CONCEPTS` covers `lexicon`, `ingredients`, `ingredientCounts`, `ingredientCategoryNames`, and `searchIngredients`, and `CONCEPT_DETAIL` covers `ingredient` (an `Ingredient` and a `Concept` share an id, and saving a card reports both as changed).

| Domain | Root fields dropped | Entities evicted |
| --- | --- | --- |
| `NOTES` | `notes` | `NoteSummary` |
| `NOTE_DETAIL` | `note` | `Note` |
| `RECIPES` | `recipes` | `RecipeSummary` |
| `RECIPE_DETAIL` | `recipe` | `Recipe` |
| `RECIPE_TAXONOMY` | `recipeTaxonomy` | none |
| `IMPORT_STATS` | `importStats` | none |
| `DASHBOARD_STATS` | `dashboardStats` | none |
| `DISCOVERIES` | `discoveryQueue`, `discoveryCounts`, `discovery` | `Discovery` |
| `CONCEPTS` | `concepts`, `searchConcepts`, `ingredients` | `ConceptSummary`, `IngredientSummary` |
| `CONCEPT_DETAIL` | `concept` | `Concept` |
| `MENTIONS` | `mention`, `playground`, `previewDecision` | `Mention` |
| `CORPUS_HEALTH` | `corpusHealth` | none |

Every Teach Peas decision (`applyDecision`) invalidates `DISCOVERIES`, `CONCEPTS`, `CONCEPT_DETAIL`, `MENTIONS`, `NOTE_DETAIL` and `RECIPE_DETAIL` (note and recipe pages show mentions), `RECIPES` (the concept filter), `DASHBOARD_STATS` (top concepts), and `CORPUS_HEALTH`; changes the decided `Discovery`; evicts a merged concept's `Concept` and `ConceptSummary`; carries the new `lexiconRevision`; and, when more than 1,000 lines are affected, sets `reprocessingJobId` to the background run. Concept editing (classifications, tags, substitutions) changes the `Concept` and invalidates `CONCEPT_DETAIL`, since other concepts inherit classifications and list substitutions. Deferring changes the `Discovery` and invalidates `DISCOVERIES`. Decision previews are queries run with `no-cache`, since each option change asks again.

Detail domains evict their entity type as well as the root field, because the read-through field policies would otherwise keep serving the cached entity.

### How the coordinator applies an effect

1. Validates the effect with Zod. A malformed effect means nobody knows what changed, so every active query refetches.
2. Inside `client.refetchQueries({ updateCache })`: evicts each `changed` and `evicted` entity, drops the root fields and entity types of each invalidated domain, and garbage-collects. Apollo then refetches exactly the active queries the evictions touched; inactive queries refetch the next time they mount.
3. Records `lexiconRevision`. A newer revision also invalidates the parse-dependent views (`NOTE_DETAIL`, `RECIPE_DETAIL`, `DASHBOARD_STATS`, and the five knowledge domains); an older one changes nothing.
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
- a failed job is reported without invalidating anything (batches retry in the queue; a run with a failed batch ends FAILED);
- reinterpretation runs pass on their progress counts;
- a coordinator that was disposed and resumed tracks jobs again.

The alias-approval scenario runs end to end in `apps/web/tests/teach.spec.ts` (scenario A: the note shows powdered sugar after the decision). Merge and in-request reinterpretation are covered by the database and API integration tests. Background reinterpretation runs end to end in `apps/web/tests/reinterpret.spec.ts`: the decision and job responses are stubbed with `page.route`, and the banner moves from "400 of 1,200 lines" to "up to date".

## Test scenarios (M5)

- Renaming a concept updates every mounted view.
- Approving an alias updates the review queue count and affected mentions after the job completes.
- Merging concepts evicts the merged id with no dangling references.
- Recipe ingredient references update after reinterpretation.
- Filtered pagination is correct after a mutation removes an item.
- A failed background job surfaces and can be retried.
- A response stamped with an older revision does not overwrite newer data.

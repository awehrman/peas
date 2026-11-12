# Cache Consistency

Status: design for modernization phase M5. Nothing here is implemented yet; the queue's parse cache and the parser's revision fields are the only pieces that exist today.

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

## Test scenarios (M5)

- Renaming a concept updates every mounted view.
- Approving an alias updates the review queue count and affected mentions after the job completes.
- Merging concepts evicts the merged id with no dangling references.
- Recipe ingredient references update after reinterpretation.
- Filtered pagination is correct after a mutation removes an item.
- A failed background job surfaces and can be retried.
- A response stamped with an older revision does not overwrite newer data.

# @peas/api

The Peas GraphQL API: schema, resolvers, authentication core, and the mutation-effect contract the web app's cache coordinator consumes. It ships TypeScript source; `apps/web` bundles it with Vite and serves it at `/api/graphql`.

| Export | Contents |
| --- | --- |
| `@peas/api` | `handleGraphQLRequest(request)` (the `/api/graphql` handler), `apiSchema` (for in-process SSR), `createApiServer`, `createFetchHandler`, `resolveViewer`, and the effect helpers |
| `@peas/api/auth` | Sessions (`createSession`, `validateSession`, `invalidateSession`), credential flows (`loginWithPassword`, `signUpWithCode`), cookie options, argon2 hashing, invite codes, queue tokens, pea avatars |
| `@peas/api/effects` | `INVALIDATION_DOMAINS`, `mutationEffectSchema`, `createMutationEffect` (browser-safe: Zod only) |

## Schema

`src/schema/schema.graphql` is the source of truth; every type and field has a description with an example. Resolvers in `src/resolvers/` are thin wrappers over `@peas/database` repository functions:

- **Queries** require a signed-in viewer (`UNAUTHENTICATED` otherwise) and normalize filters (blank strings become "no filter", bad page numbers become 1).
- **Mutations** return a payload implementing `MutationPayload { success, message, effect }`. Expected failures (validation, permissions, missing rows) come back as `success: false` with a readable message; database error details are logged, never returned.
- **Effects** describe what the client cache must reconcile (see [cache consistency](../../docs/architecture/cache-consistency.md)).
- **Queue calls** go through `src/queue-client.ts` with a `createQueueToken` bearer token, to `QUEUE_INTERNAL_URL` (default `http://localhost:4200`): `applyDecision` starts a background reinterpretation when more than 1,000 lines are affected (its job id comes back as `effect.reprocessingJobId`, and `Query.job` reports the run's progress) and announces every new lexicon revision; `corpusHealth` reads the queue's live parse metrics. Both degrade gracefully when the queue is down.
- **Ingredient cards** (`src/resolvers/ingredients.ts`, any signed-in viewer) read and edit food concepts in the original card shape. `saveIngredient` turns name, plural, alias, and parent changes into one `EDIT_CONCEPT` decision (plus `APPROVE_CONCEPT` for a proposed food) and runs the same follow-up as `applyDecision` for each: reinterpretation, the decision's mention count, the revision announcement, and a background run when needed. The teach queries, concepts list, `lexicon`, corpus health, and the grammar loop are gated by `canCurateKnowledge` (every signed-in user for now); `cleanupAllData` and note promotion stay admin-only.
- **Grammar loop** (`src/resolvers/grammar-loop.ts`, curators): `corpusHealthTrends`, `Discovery.fixtureBlock` (structural patterns only), `markDiscoveryAsNoise`, `startReparse` and `runExploratorySweep` (through the queue; a reparse's run id comes back as `effect.reprocessingJobId`), and `takeHealthSnapshot` (in-process). Integration tests set `QUEUE_INTERNAL_URL` to an unreachable address and stub `fetch` where they need queue answers.

```graphql
mutation {
  updateRecipe(input: { id: "cm3r...", title: "Chili", categories: ["Dinner"], tags: [] }) {
    success
    message
    effect { changed { typename id } invalidatedDomains }
  }
}
# -> { success: true, message: null, effect: { changed: [{ typename: "Recipe", id: "cm3r..." }], invalidatedDomains: ["RECIPES", "RECIPE_TAXONOMY"] } }
```

## HTTP

Apollo Server 5 has no Fetch-API integration, so `src/http/fetch-handler.ts` adapts `Request` and `Response`. It passes non-JSON POST bodies through as empty so Apollo's CSRF prevention rejects simple cross-site requests. Introspection, stack traces, and the Sandbox landing page are on only when `development` is true.

## Commands

```bash
yarn workspace @peas/api codegen      # regenerate src/generated/resolvers-types.ts after schema changes
yarn workspace @peas/api typecheck
yarn workspace @peas/api lint
yarn workspace @peas/api test:run     # server operations (database mocked), Fetch adapter and CSRF, effects, auth helpers
TEST_DATABASE_URL=postgresql://<you>@localhost:5432/peas_test yarn workspace @peas/api test:int       # plus sign-up, sign-in, sessions, and every resolver against a real database
TEST_DATABASE_URL=... yarn workspace @peas/api test:coverage   # both suites with the coverage floor
```

The integration setup applies pending migrations to `TEST_DATABASE_URL` (it refuses databases whose name lacks "test"), and removes R2 credentials so `cleanupAllData` cannot touch real storage.

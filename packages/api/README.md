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

# @peas/web

The Peas web app on TanStack Start, with a GraphQL API (Apollo Server 5, in `@peas/api`) and Apollo Client 4. It replaced the Next.js app on 12 November 2026. Creating users and admins is covered in [SIGN_UP_CODES.md](SIGN_UP_CODES.md).

| | |
| --- | --- |
| Dev server | `yarn workspace @peas/web dev` on http://localhost:3100 (also started by the root `yarn dev`) |
| Production | `yarn workspace @peas/web build`, then `yarn workspace @peas/web start` |
| GraphQL | `/api/graphql` (Apollo Sandbox in development) |
| Background | [web modernization](../../docs/architecture/web-modernization.md), [cache consistency](../../docs/architecture/cache-consistency.md) |

## How it fits together

- **Pages** are file routes in `src/routes`. Signed-in pages live under `_authed/`, whose `beforeLoad` redirects to `/login` without a session.
- **Data** comes from GraphQL. Route loaders call `preloadQuery(Document, { variables })`; components read with `useReadQuery`. During server rendering, queries run in-process (`SchemaLink`); in the browser they go to `/api/graphql`.
- **Mutations** use `useMutationAction(Document, { variables, payload, result })`, which returns the `MutationAction` shape `@peas/features` components expect and sends each mutation's effect to the cache coordinator.
- **Auth** uses TanStack server functions in `src/server/auth.functions.ts` (sign in, sign up, sign out, current viewer, queue token). The session cookie is the same one `apps/web` uses.
- **UI** comes from `@peas/features` and `@peas/components`, unchanged. `RouterNavigationProvider` gives them TanStack Router navigation.
- **Teach Peas** (admins only, enforced by the routes' `beforeLoad` and by the resolvers): `/teach` (review queue), `/teach/$discoveryId` (review card), `/teach/playground`, `/concepts`, and `/concepts/$id`. `src/lib/teach.ts` holds the shared actions (apply, defer, preview, concept search); decision payloads go to GraphQL as JSON and are validated on the server.

```text
src/
  routes/                 file routes (__root, _authed layout, pages, api/graphql)
  graphql/operations/     .graphql operations; codegen writes generated.ts and possible-types.ts
  lib/apollo/             cache config, links, cache coordinator, useMutationAction
  server/                 TanStack server functions (auth)
  components/             app shell, sign-in layout, credential forms, route states
tests/                    Playwright end-to-end tests and their seed
```

## Example: a page with a query and a mutation

```tsx
export const Route = createFileRoute("/_authed/recipes/$id")({
  loader: ({ context: { preloadQuery }, params }) => ({
    queryRef: preloadQuery(RecipeDetailDocument, { variables: { id: params.id } }),
  }),
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { data } = useReadQuery(Route.useLoaderData().queryRef);
  const onUpdate = useMutationAction(UpdateRecipeDocument, {
    variables: (input: RecipeUpdateInput) => ({ input }),
    payload: (result) => result.updateRecipe,
  });
  return data.recipe ? <RecipeDetailPageContent recipe={data.recipe} onUpdate={onUpdate} /> : <NotFoundState />;
}
```

After `updateRecipe` succeeds, its effect evicts the recipe and the recipes list; the open page and any mounted list refetch on their own.

## Adding or changing an operation

1. Edit or add a `.graphql` file in `src/graphql/operations` (and the schema in `packages/api/src/schema/schema.graphql` if needed).
2. Run `yarn workspace @peas/api codegen` (server types) and `yarn workspace @peas/web codegen` (operation types, `possibleTypes`).
3. Import the generated `...Document` from `~/graphql/generated`.

Every mutation selects `...PayloadFields` so the coordinator receives its effect.

## Environment

The app reads the repo-root `.env.local`. Server code uses `process.env` (`DATABASE_URL`, `QUEUE_AUTH_SECRET`, `SIGN_UP_CODES`, R2 keys). The browser bundle inlines the `NEXT_PUBLIC_*` values `@peas/features` still reads (upload endpoint, websocket settings) through Vite's `define`.

The import page calls the queue from the browser, so the queue's `CORS_ALLOWED_ORIGINS` must include `http://localhost:3100`.

## Testing

```bash
yarn workspace @peas/web typecheck
yarn workspace @peas/web lint
yarn workspace @peas/web test:run     # cache coordinator, search params, teach helpers
TEST_DATABASE_URL=postgresql://<you>@localhost:5432/peas_test yarn workspace @peas/web test:e2e
```

The end-to-end run starts its own dev server on port 3110 against `TEST_DATABASE_URL`, applies migrations, and seeds a user (`e2e@peas.test` / `peas-e2e-password`), a note, a recipe, three ingredients, and for Teach Peas a small ontology and a backfilled note. Suites cover auth, notes, recipes, ingredients, import, and Teach Peas (scenarios A, B, C, E and a keyboard-only review) in Chromium and WebKit, with axe WCAG 2.1 AA scans. Install the browsers once with `npx playwright install chromium webkit`. `yarn workspace @peas/web test:coverage` reports unit coverage; see [testing](../../docs/testing.md) for every suite and the coverage floors.

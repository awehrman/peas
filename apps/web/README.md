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
- **Ingredients** (`/ingredients`, everyone) is the ingredient card view backed by food concepts: Approved lists every approved food (variants in italics), Needs review lists every proposed food, with grouping by name, property, reference count, or relationship. On the Approved list a card opens read-only (only the fields that have values) with an edit button; in Needs review it opens ready to edit, and Cancel discards every change. Any signed-in user edits a food on its card (name and plural on one line; alternate names, refused when another food already answers to them; base ingredients, each added as a relationship plus an existing food; substitutes, picked from the five closest existing foods; categories; tags; core types and allergens, composed); list fields show their entries and a plus button that opens the input. Properties show what the food inherits from its base ingredients ("from wheat"); unchecking an inherited one stores "does not contain". vegan, vegetarian, and gluten-free appear as automatic tags in the Tags field (computed from the properties, never stored), and a food made or processed from another is composed and can add a food with Add ingredient. A base food's card lists its variants grouped by relationship ("Processed from tomato: canned tomatoes"). Saving marks the food reviewed, which approves a proposed one. Name and relationship changes go through one `EDIT_CONCEPT` decision (approval through `APPROVE_CONCEPT`), so they bump the revision, reinterpret affected lines, and can be reverted; properties, category, tags, and substitutions are written directly. Each card links to `/recipes?concept=<id>` and to its concept page.
- **Ingredients page loading:** suspense-read queries suspend again whenever they refetch, so the route wraps its content in its own Suspense boundary whose fallback keeps the last list and card on screen (dimmed, inert) instead of the layout spinner; saving a card or "Save and next" no longer blanks the page. Approving a food drops it from the "Needs review" list before "Save and next" opens the next card, so the route keeps showing the list the selected food was last listed in until the selection changes (`useGroupsKeepingSelected`); otherwise the card would jump above the group header. The signed-in layout reuses the last viewer check for a minute on navigations within signed-in pages (entering them always checks), so moving between cards skips a server round trip.
- **Knowledge** (whoever `canCurateKnowledge` allows, enforced by each route's `beforeLoad` and by the resolvers; for now every signed-in user, see `src/lib/permissions.ts` and `canCurateKnowledge` in `packages/api/src/context.ts`) is one section with tabs, rendered by `src/components/knowledge-layout.tsx`: the review queue (`/teach`, with the corpus health card; `/teach/$discoveryId` is the review card; `/teach/playground`), Concepts (`/concepts`, every concept approved or not, and `/concepts/$id` with the Approve button, name and relationship editing through decisions, and classifications, tags, and substitutions through `src/lib/concepts.ts`), and Lexicon (`/lexicon`, every name and modifier with what it means, searchable and filterable by role). `src/lib/teach.ts` holds the shared review actions; decision payloads go to GraphQL as JSON and are validated on the server. A banner in the layout follows background reinterpretation runs (`src/lib/apollo/use-reinterpret-progress.ts`). A Health tab (`/teach/health`) charts corpus health snapshots, unresolved share by parser version, and weekly review throughput (plain SVG charts, each with a data table), lists the top unknown and ambiguous phrases, and holds the maintenance controls: Reparse with the running parser (progress shows in the banner), Run sweep, and Take snapshot. A structural pattern's review card shows its examples as pending golden cases to copy, and offers Mark as noise and Defer instead of decision options. The Knowledge navigation entry stays highlighted on every Knowledge path.

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

The end-to-end run starts its own dev server on port 3110 against `TEST_DATABASE_URL`, applies migrations, and seeds a user (`e2e@peas.test` / `peas-e2e-password`), a note, two recipes, and for Teach Peas a small ontology and a backfilled note. Suites cover auth, notes, recipes, concepts, import, reinterpretation progress, and Teach Peas (scenarios A, B, C, E and a keyboard-only review) in Chromium and WebKit, with axe WCAG 2.1 AA scans. Install the browsers once with `npx playwright install chromium webkit`. `yarn workspace @peas/web test:coverage` reports unit coverage; see [testing](../../docs/testing.md) for every suite and the coverage floors.

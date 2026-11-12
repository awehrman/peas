# Web Modernization (Next.js to TanStack Start, GraphQL with Apollo Client 4)

Status: audit complete (12 November 2026); no framework code changed yet.
This covers modernization phases M3 (tooling) and M4 (framework), and feeds
M5 ([cache consistency](./cache-consistency.md)).

## Headline finding: GraphQL does not exist today

The amendment assumes GraphQL and Apollo are retained. They are not present:

- No workspace depends on `graphql`, `@apollo/*`, `graphql-yoga`, `urql`, or
  `@graphql-codegen/*`; there are no `.graphql` files, `gql` tags, or codegen
  configs. `graphql@16.11.0` appears only as a transitive dependency of `msw`.
- The web app reads data in async server components that call
  `@peas/database` directly (5 pages) and writes through 9 server-action
  files (14 actions). There are no route handlers.

Adopting GraphQL is therefore **new work**: a schema, a server, resolvers over
the domain services, codegen, and an Apollo client. That is compatible with the
target architecture but changes the size of M4. See "Decisions needed".

## Current stack

| Concern | Today |
| --- | --- |
| Framework | Next.js 15.4.2, React 19.1.1, App Router |
| Data reads | Server components importing `@peas/database` (notes, notes detail, recipes, recipe detail, ingredients) |
| Data writes | Server actions (`"use server"`) passed as props into `@peas/features` page components and run through `useMutation` (`useTransition`); forms use `useActionState` / `useFormStatus` |
| Cache invalidation | `revalidatePath` (9 calls in 3 files) |
| Auth | Hand-rolled Lucia-style sessions: SHA-256 hashed tokens in the `Session` table, `session` cookie via `next/headers`, argon2 passwords, invite codes from `SIGN_UP_CODES` |
| Queue access | Browser calls the queue directly (upload `fetch` with a 5-minute HMAC token from the `getQueueToken` server action; WebSocket with `?token=`) |
| Shared UI | `@peas/features` and `@peas/components`: **no `next/*` imports**; navigation is injected through `AppNavigationProvider({ LinkComponent, push })` |
| Storybook | `@storybook/react-vite` 8.6.14 (already Vite-based) |
| E2E | Playwright 1.55 with `@axe-core/playwright`, `webServer: yarn dev` on port 3000 |
| Deployment | `railway.toml` (nixpacks, `yarn workspace @peas/web start`); no deploy config for the queue; no CI workflows |

## Next.js-specific surface to replace

| API | Count | Where |
| --- | --- | --- |
| `redirect` | 10 calls in 7 files | auth helpers and actions, invite page |
| `notFound` | 2 | notes and recipe detail pages |
| `usePathname`, `useRouter` | 1 file | `lib/auth/components/authenticated-layout.tsx` |
| `next/link` | 2 files | authenticated layout, `app/error.tsx` |
| `next/headers` `cookies()` | 2 files | `get-auth.ts`, `session-cookie.ts` |
| `next/font/google` | 1 | root layout (Source Sans 3) |
| `revalidatePath` | 9 calls, 3 files | recipe, ingredient, and line-review actions |
| `"use server"` | 9 files | listed in the audit |
| `import "server-only"` | 4 files | session, auth, queue token, avatar |
| `export const dynamic = "force-dynamic"` | 9 files | protected layout and data pages |
| `NEXT_PUBLIC_*` reads | `@peas/features` (upload endpoint, WebSocket URL/host/port) | must move to `import.meta.env.VITE_*` or a build-time define |
| Config | `transpilePackages`, `serverActions.bodySizeLimit: 50mb`, `next/core-web-vitals` ESLint, `nextjs.json` tsconfig | |

Routes to migrate: `/login`, `/invite/:code`, `/password-reset`, and the
protected group (`/`, `/import`, `/notes`, `/notes/:id`, `/recipes`,
`/recipes/:id`, `/ingredients`, `/design`), plus root `loading`, `error`, and
`not-found` boundaries.

## Migration plan (M4)

1. **GraphQL server and schema.** Host the server in a TanStack Start server
   route (see decisions) and define the schema over domain services in
   `packages/database` (later, ontology services). Prisma types never become
   the GraphQL contract.
2. **New app.** Scaffold `apps/web-start` (TanStack Start + TanStack Router)
   alongside `apps/web`, reusing `@peas/features`, `@peas/components`,
   `@peas/theme`, `@peas/tailwind`. Inject TanStack Router's `Link` and
   `navigate` through `AppNavigationProvider`.
3. **Apollo Client 4.** Request-scoped clients on the server, cache
   restoration on hydration, type policies keyed by immutable ids, and
   session isolation between users.
4. **Codegen.** GraphQL Code Generator with stable fragments for
   FoodConcept, FoodTerm, IngredientMention, KnowledgeProposal,
   KnowledgeDecision, Recipe, and ImportJob.
5. **Auth.** Port session validation to TanStack Start server functions or
   middleware (cookie read/write without `next/headers`); keep the session
   table, token hashing, and argon2 unchanged. The GraphQL context resolves
   the user from the same cookie.
6. **Representative slice first:** notes list and note detail (query, the
   line-review mutation, routing, loading and error states, cache behavior,
   Playwright + axe test). Then migrate the remaining routes.
7. **Env and assets.** Replace `NEXT_PUBLIC_*` with `VITE_*`; replace
   `next/font` with `@fontsource` (Storybook already uses it).
8. **Cutover.** Point Playwright and `railway.toml` at the new app; remove
   Next.js dependencies and config only after it is stable. Never combine
   the cutover with a destructive ontology migration.

## Tooling (M3) record, 12 November 2026

### Group A: TypeScript

| Field | Value |
| --- | --- |
| Previous | TypeScript 5.9.2 (declared ^5.8.3) |
| New | TypeScript 6.0.3 in every workspace; the codebase also typechecks cleanly with TypeScript 7.0.2 |
| Why not 7 now | TypeScript 7.0 ships no JavaScript API (planned for 7.1). typescript-eslint, Next.js type checking, tsup declarations, and ts-node need it. Microsoft's side-by-side setup (`typescript` aliased to `@typescript/typescript6`) fails under Yarn 4, which force-applies its built-in `typescript` patch to the alias; installing both majors also collides on the `tsc` binary. |
| TS 7 speed (typecheck, local) | queue 5.8 s → 1.0 s; features 2.1 s → 0.2 s; database 1.9 s → 0.3 s; parser 1.0 s → 0.2 s |
| Breaking changes handled | `baseUrl` removed from `react-library.json`, components, features, web (paths are relative to each tsconfig); web's bare `src/paths` import made relative; web gained `src/css.d.ts` for side-effect CSS imports; features lists `types: ["node"]` (6.0 defaults `types` to empty) |
| Related | typescript-eslint 8.42 → 8.72.2 (8.42 supports TypeScript < 6 only) |
| Validation | `tsc --noEmit` with TS 6.0.3 and TS 7.0.2 in parser, database, components, features, theme, storybook, queue, web |
| Rollback | Revert the `typescript` ranges and the tsconfig edits |
| Next step | Adopt TypeScript 7 when 7.1 ships its API and typescript-eslint/Next.js support it |

### Group B: Vite and Vitest

| Field | Value |
| --- | --- |
| Previous | Vitest 3.2.4 everywhere; Vite 7.1.4 (Storybook) |
| New | Vitest 5.1.0 and Vite 8.3.8 in queue, features, parser. Storybook stays on Vitest 3.2.4 / Vite 7.1.4 because its Storybook 8 test addon is tied to them (moves with the deferred Storybook 10 upgrade). |
| Breaking changes handled | Mocks invoked with `new` must be `function` implementations (Vitest 4+); a TypeScript-API codemod converted arrow implementations in the affected queue and features tests. `vi.mock` calls nested inside helper functions moved to module top level (they were always hoisted). `vi.restoreAllMocks` no longer resets `vi.fn` implementations: three tests now reset or set what they depend on. `ReturnType<typeof vi.fn>` (now `Mock<Procedure \| Constructable>`) replaced by `Mock` in 90 queue test files. `coverage.all` removed. |
| Also fixed | 9 queue tests that hard-coded an old checkout path now derive it from `process.cwd()`; a one-in-a-thousand flaky categorization job id is now strictly increasing |
| Validation | parser 267 pass + 5 expected known failures (golden fixtures unchanged); features 185/185; queue 4,415 pass, 5 skipped, exit 0 with no unhandled errors; queue coverage run 98.6% statements |
| Rollback | Revert the vitest/vite ranges and the test edits |

### Group C: lint and workspace tooling

| Field | Value |
| --- | --- |
| Upgraded | Turbo 2.6.1 → 2.11.11; Prettier 3.6.2 → 3.10.1; lint-staged 16.1.6 → 17.6.0; tsup 8.5.0 → 9.0.0; typescript-eslint → 8.72.2 |
| Deferred | ESLint 10 and `eslint-plugin-react-hooks` 7: `eslint-config-next` 15 supports ESLint ≤ 9, and react-hooks 7 adds React Compiler rules. Upgrade after the Next.js cutover. |
| Breaking changes handled | Root `engines.node` raised to `>=22.22` (lint-staged 17 needs 22.22.1, tsup 9 needs 22.18); queue's tsconfig sets `declaration: false` (tsc only typechecks; tsup emits declarations); features no longer builds or exports its test utilities (nothing consumed `@peas/features/test-utils`); the database package declares its ESLint dependencies so `yarn lint` runs there |
| Known issue | Prettier's bin file ships without the executable bit; run it as `yarn prettier`, which works |

### Group D: low-risk updates (within majors)

Peggy 5.0.6 → 5.1.1, Zod 4.1.5 → 4.6.7, React/React DOM 19.1.1 → 19.3.1,
`@types/react` → 19.3.0, Tailwind 4.1.12 → 4.3.5, Playwright 1.55 → 1.65,
AWS SDK 3.879 → 3.1167. Duplicate copies of `@types/react` and
`playwright-core` were deduplicated (`yarn dedupe`) to fix type conflicts.

### Deferred

| Package | Current | Plan |
| --- | --- | --- |
| BullMQ, redis | 5.58.4, 5.8.2 | After M4/M5 |
| Storybook (with its Vitest 3 / Vite 7) | 8.6.14 | Storybook 10 after the framework settles |
| react-window | 1.8.11 | Evaluate TanStack Virtual first |
| ESLint, react-hooks plugin | 9.34, 5.2 | After the Next.js cutover |

Runtime: Node 22.23.4, Yarn 4.9.1 (`nodeLinker: node-modules`,
`enableScripts: false`), root `engines.node >= 18` (should be raised to match
Prisma and TanStack Start requirements).

## Pre-existing issues found during the audit

- Fixed in M3: 9 queue tests hard-coded `/Users/awehrman/projects/peas/...`;
  they now derive paths from `process.cwd()`.
- Unused web dependencies: `oslo`, `matter-js`, `@peas/parser` (until Phase 4).
- `.env.local.example` lists `NEXT_PUBLIC_UPLOAD_ENDPOINT` but not the
  `NEXT_PUBLIC_WEBSOCKET_*` variables.

## Decisions

1. **Decided (12 November 2026): the GraphQL server runs inside the TanStack
   Start app** as a server route, sharing the session cookie with page
   requests. The queue service stays a job/upload service and is not a GraphQL
   host.

2. **Decided (12 November 2026): Apollo Server 5** as the GraphQL server
   library, paired with Apollo Client 4 on the frontend.
3. **Decided: M4 starts after the M1–M3 changes are reviewed and committed**,
   so the framework migration is reviewed on its own.

Still open:

4. **Scope of the first slice:** confirm notes list + note detail.

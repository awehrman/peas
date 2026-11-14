# Testing and coverage

Every package runs Vitest; the web app also runs Playwright. Integration and end-to-end tests use a throwaway Postgres database named by `TEST_DATABASE_URL`; nothing touches the development database.

## One-time setup

```bash
createdb peas_test                              # the database name must contain "test"
npx playwright install chromium webkit          # browsers for the end-to-end tests
export TEST_DATABASE_URL=postgresql://<you>@localhost:5432/peas_test
```

## Suites

| Package | Command | What it covers | Database |
| --- | --- | --- | --- |
| `apps/queue` | `test:run` | Workers, services, routes, middleware (repositories mocked), including the v2 parse and save steps, the lexicon cache, background reinterpretation, reparses, health snapshots, exploratory sweeps, maintenance schedules, and ingredient metrics | No |
| `packages/parser` | `test:run` | v2 normalizer, tokenizer, lexicon, grammar golden sets, invariants, schemas, ontology rules, resolver (semantic golden set, metamorphic, coordination, exploratory), resolution report, modifier seed file, discovery generation, the in-memory decision mirror, resolution diffs, structure signatures, fixture drafts, stored-syntax upgrades, threshold calibration | No |
| `packages/features` | `test:run` | Shared UI components and utilities, including the Teach Peas screens (with the structural card and the Health tab), concept pages, ingredient cards, and the Knowledge tabs and lexicon (jsdom) | No |
| `packages/database` | `test:run` | Ontology helpers and Prisma/parser enum parity | No |
| `packages/database` | `test:int` | Ontology repositories, migrations' constraints, vocabulary and modifier seeds, `loadResolverSnapshot`, the backfill (idempotent, resumable), every decision type against the in-memory mirror, revert, merge and its undo, previews, the review queue, adjacency mining, every section-32 example, the v2 import save (one mention per coordinated part, idempotent, no legacy writes), reinterpretation runs, concept editing, the recipe concept filter, top concepts, corpus health, the starter-foods seed (idempotent, real lines resolve), ingredient cards (save, approve by saving, revert), approving a proposed food (preview, reinterpretation, revert), structural discoveries, mark as noise, pending fixtures, exploratory sweeps, the dry-run reparse, health snapshots and trends, and import integrity (structured sources and book matching, duplicate detection and every resolution with undo, ingredient-inferred categories that keep reviewer decisions, the backfill) | Wiped and migrated |
| `packages/api` | `test:run` | Resolvers with the database mocked, the Fetch adapter and CSRF, the effect contract, auth helpers, Teach Peas view builders, the queue client, concept editing, corpus health, reinterpretation jobs | No |
| `packages/api` | `test:int` | Sign-up, sign-in, sessions, and every resolver through the real repositories, including the Teach Peas queries and decisions, concept editing, ingredient cards, the lexicon, and the grammar loop (queue calls stubbed; `QUEUE_INTERNAL_URL` points nowhere) | Migrated; suites truncate their tables |
| `apps/web` | `test:run` | The Apollo cache coordinator (including reinterpretation progress and resuming after dispose), search-param parsing, Teach Peas action helpers | No |
| `apps/web` | `test:e2e` | Auth, notes (including v2 mentions), recipes, ingredient cards (views, grouping, relationships, approving by saving, adding), concepts (editing, the concept filter, Approve), the Knowledge tabs and lexicon, import, reinterpretation progress, the grammar loop (structural card, mark as noise, Health tab), and Teach Peas (scenarios A, B, C, E, keyboard-only review) in Chromium and WebKit, with axe WCAG 2.1 AA scans | Migrated and reseeded (including a small ontology and a backfill) |

Run any of them with `yarn workspace <package> <command>`. The integration and end-to-end commands need `TEST_DATABASE_URL`; without it the integration suites skip and the end-to-end run refuses to start.

## Coverage

`yarn test:coverage` runs every package's `test:coverage` one at a time (set `TEST_DATABASE_URL` first so the database-backed packages include their integration suites). Each package counts its own application source only: tests, test helpers, and generated code are excluded, and every source file counts whether or not a test imports it.

Each config sets a threshold at the floor of the last measurement, so coverage can only go up; raise the numbers when it does.

| Package | Statements | Branches | Notes |
| --- | --- | --- | --- |
| `apps/queue` | 96% | 95% | |
| `packages/parser` | 96% | 89% | |
| `packages/api` | 90% | 80% | With integration tests |
| `packages/database` | 80% | 69% | The ontology repositories, cleanup, and seeds are exercised directly; note, recipe, and queue-job repositories are covered mostly through `@peas/api` |
| `packages/features` | 47% | 52% | Many older components are only exercised by the end-to-end tests |
| `apps/web` | 21% | 24% | Unit coverage only; routes and components are covered by the 80 end-to-end tests (40 per browser), which are not counted |

Coverage HTML reports land in each package's `coverage/` folder (git-ignored).

## Writing end-to-end tests

- Use `visit(page, path)` and `waitForHydration(page)` from `apps/web/tests/support/auth.ts` after every full page load; clicks on server-rendered markup before hydration are lost.
- Chromium and WebKit share one seeded database per run, so tests that create or rename data use per-browser names (`test.info().project.name`).
- Seed data lives in `apps/web/tests/support/seed.ts` (user `e2e@peas.test` / `peas-e2e-password`, a note, two recipes (one with chicken thighs for the concept filter), two proposed foods per browser (one approved by saving its ingredient card, one with the concept page's Approve button), one structural line per browser (each project marks its own pattern as noise), and for Teach Peas a small ontology plus a note whose lines the backfill turns into mentions and discoveries). Decisions change global knowledge, so every phrase a teach test decides exists once per browser project (`E2E_TEACH.perProject`).
- Highlighted lines add screen-reader role labels between words ("milk (food)"), so find an ingredient row by its review button or the "Peas reading of" list rather than by the raw line text.
- `apps/web/tests/import-review.spec.ts` decides and undoes a seeded duplicate pair (one per browser project, so the projects never share a decision) and scans the review pages with axe.
- `apps/web/tests/reinterpret.spec.ts` stubs `ApplyDecision` and `JobStatus` with `page.route`, so it can show a background run without touching the seeded knowledge or needing the queue.
- `signIn` submits with Enter and waits for the dashboard's requests to finish, so the next navigation does not cancel them (WebKit logs cancelled requests as console errors).

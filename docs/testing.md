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
| `apps/queue` | `test:run` | Workers, services, routes, middleware (repositories mocked) | No |
| `packages/parser` | `test:run` | v2 normalizer, tokenizer, lexicon, grammar golden sets, invariants, schemas, ontology rules; v1 snapshot | No |
| `packages/features` | `test:run` | Shared UI components and utilities (jsdom) | No |
| `packages/database` | `test:run` | Ontology helpers and Prisma/parser enum parity | No |
| `packages/database` | `test:int` | Ontology repositories, migrations' constraints, vocabulary seed, every section-32 example | Wiped and migrated |
| `packages/api` | `test:run` | Resolvers with the database mocked, the Fetch adapter and CSRF, the effect contract, auth helpers | No |
| `packages/api` | `test:int` | Sign-up, sign-in, sessions, and every resolver through the real repositories | Migrated; suites truncate their tables |
| `apps/web` | `test:run` | The Apollo cache coordinator | No |
| `apps/web` | `test:e2e` | Auth, notes, recipes, ingredients, and import pages in Chromium and WebKit, with axe WCAG 2.1 AA scans | Migrated and reseeded |

Run any of them with `yarn workspace <package> <command>`. The integration and end-to-end commands need `TEST_DATABASE_URL`; without it the integration suites skip and the end-to-end run refuses to start.

## Coverage

`yarn test:coverage` runs every package's `test:coverage` one at a time (set `TEST_DATABASE_URL` first so the database-backed packages include their integration suites). Each package counts its own application source only: tests, test helpers, and generated code are excluded, and every source file counts whether or not a test imports it.

Each config sets a threshold at the floor of the last measurement, so coverage can only go up; raise the numbers when it does.

| Package | Statements | Branches | Notes |
| --- | --- | --- | --- |
| `apps/queue` | 96% | 95% | |
| `packages/parser` | 94% | 88% | v2 only; v1 is checked by snapshot |
| `packages/api` | 86% | 77% | With integration tests; 53% without |
| `packages/database` | 31% | 37% | The ontology code is 84%; the legacy repositories are exercised through `@peas/api`'s integration tests (recipes 91%, ingredients 53%, notes 19%) and the queue's mocks |
| `packages/features` | 23% | 22% | Many components are only exercised by the end-to-end tests |
| `apps/web` | 21% | 21% | Unit coverage only; routes and components are covered by the 38 end-to-end tests, which are not counted |

Coverage HTML reports land in each package's `coverage/` folder (git-ignored).

## Writing end-to-end tests

- Use `visit(page, path)` and `waitForHydration(page)` from `apps/web/tests/support/auth.ts` after every full page load; clicks on server-rendered markup before hydration are lost.
- Chromium and WebKit share one seeded database per run, so tests that create or rename data use per-browser names (`test.info().project.name`).
- Seed data lives in `apps/web/tests/support/seed.ts` (user `e2e@peas.test` / `peas-e2e-password`, a note, a recipe, three ingredients).

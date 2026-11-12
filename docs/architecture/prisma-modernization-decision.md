# Prisma Modernization Decision

Status: **decided (12 November 2026): upgrade to Prisma 7 (7.10.x) now;
revisit Prisma 8 after GA.** The M1 proof of concept ran against both
versions; results are below.

Assessed on 12 November 2026 against `@prisma/client` 6.11.1 and `prisma` CLI
6.15.0 on Node 22.23.4 and PostgreSQL 17 (Homebrew, local development).

## Time pressure

Prisma 6 security patches end on **19 November 2026**
([release status](https://www.prisma.io/docs/orm/release-status)). Staying on
6 past that date is the riskiest option.

## Release status

| Version | Status | Latest | Notes |
| --- | --- | --- | --- |
| Prisma 7 | GA since 19 Nov 2025 | 7.10.1 (19 Oct 2026) | Supported for 18 months after Prisma 8 GA |
| Prisma 8 | Release candidate | CLI 8.0.0-rc.33, `@prisma/orm-postgres` 8.0.0-rc.23 (6 Nov 2026) | GA was expected October 2026; recent RCs still ship breaking changes |

`npm install prisma` now resolves to Prisma 8, so any Prisma 7 install must pin
`prisma@^7` and `@prisma/client@^7`.

Sources: [release status](https://www.prisma.io/docs/orm/release-status),
[GitHub releases](https://github.com/prisma/prisma/releases),
[Prisma 8 RC blog](https://www.prisma.io/blog/is-prisma-8-ready-for-long-lived-production-apps).

## How Peas uses Prisma today

| Area | Usage |
| --- | --- |
| Clients | `packages/database/src/client.ts` singleton; a **second client** in `apps/queue/src/config/database.ts` (uses `datasources`, removed in v7); a client created per completion broadcast in `track-completion/service.ts`; one per database script |
| Generator | `prisma-client-js`, no `output` path, `previewFeatures = ["fullTextSearchPostgres"]` (unused: zero `search:` filters) |
| Transactions | 9, all interactive callbacks; only option used is `timeout: 30000` |
| Nested writes | `create`, `deleteMany`+`create`, one-to-one `upsert`, `connect`, `set`, `connectOrCreate` (concentrated in `note.ts`, `ingredient.ts`, `recipe.ts`, `source.ts`) |
| Bulk | 6 upserts (one keyed on a `String[]` unique), 3 `createMany`, 1 `updateMany`, 27 `deleteMany` |
| Reads | include/select up to 4 levels, `_count`, `some`/`none` filters, `distinct`, `mode: "insensitive"`, skip/take pagination, 2 aggregates |
| JSON | 4 `Json?` columns, written only; no JSON filters |
| Raw SQL | 5 calls (health checks; the grammar archive script) |
| Atomic ops | 1 `increment` (pattern tracking, retiring with v1 in Phase 7) |
| Errors | `P2002` via `instanceof` in sign-up, duck-typed `code` checks, and message-text matching ("Unique constraint", "No record was found", "current transaction is aborted") |
| Generated types outside the package | ~14 queue files (`Note`, `NoteStatus`, `QueueJob`, `PrismaClient`, `Prisma.InputJsonValue`), 3 web files; neither app declares `@prisma/client` as a dependency |
| Tests | 23 queue files mock `@peas/database`; no test database |
| Deployment | `railway-build.js` generates the client; nothing runs `migrate deploy` |

## Ontology compatibility matrix

| Requirement | Prisma 7 | Prisma 8 RC | Notes |
| --- | --- | --- | --- |
| Typed self-relations and join tables (FoodRelationship) | Yes | Yes; implicit many-to-many may need an explicit join model | Ontology design already uses explicit models |
| Indexed normalized lookups (LexiconEntry) | Yes | Yes | |
| High-volume mention inserts/updates | Yes (`createMany`, `upsert`) | Yes (`createAll`, `upsert` with `conflictOn`) | |
| Transactional revision increments | Yes (`increment`, interactive tx) | **No `increment` on PostgreSQL**; raw SQL inside `db.transaction` | `LexiconRevision` uses an autoincrement row, so increments are avoidable |
| Atomic multi-table decisions | Yes | Yes (`db.transaction`, callback form only) | |
| Concept merges (re-pointing foreign keys) | Yes (`updateMany`, nested `set`) | Partial: nested `set`, `connectOrCreate`, nested `update/upsert/delete` missing | Rewrite as flat statements in a transaction |
| Bulk evidence with conflict handling | Yes (`createMany` + `skipDuplicates`) | Yes (`onConflict: "skip"`) | |
| JSON-backed provenance and syntax trees | Yes (stored and read whole) | Yes, as `Jsonb`, compared whole only | Peas never filters inside JSON |
| Durable job requests | Yes | Yes | |
| Batch backfills | Yes | Yes | |
| Recursive relationship queries (cycle checks) | Raw SQL (`$queryRaw` CTE) | Raw SQL (`db.raw.sql`) | Same approach either way |
| Unique-violation handling | `P2002` | **`P2002` removed**; check `sqlState === "23505"` | Centralize in one helper either way |
| Transaction isolation | Configurable | Not configurable (READ COMMITTED) | Peas does not set isolation today |

## Prisma 7 migration cost (estimated small)

1. Pin `prisma@^7`, `@prisma/client@^7`; add `@prisma/adapter-pg` and `pg`.
2. Create clients with `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`;
   collapse the queue's second client and the per-broadcast client into the
   shared singleton.
3. Add `prisma.config.ts` (datasource URL, shadow URL); load env with `dotenv`
   explicitly.
4. Decide generator: keep `prisma-client-js` short term, or move to
   `prisma-client` with an `output` path and re-export types from
   `@peas/database` so apps stop importing `@prisma/client` directly.
5. Update scripts: drop `--skip-generate`; replace `db execute --url` and
   `migrate diff --from-url` in `verify-migrations.js` with config-datasource
   forms.
6. Review the pool and SSL defaults (no connection timeout; invalid
   certificates rejected) for the hosted database.
7. Drop the unused `fullTextSearchPostgres` preview flag.
8. Replace message-text error matching with a typed `isUniqueViolation` helper.

No query rewrites are expected; the v7 guide lists no changes to
transactions, nested writes, upsert, `createMany`, raw queries, Json, or
`P2002`. Source: [v7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7).

## Prisma 8 migration cost (estimated large)

- New contract model (`contract.prisma`, `prisma contract emit`), no generated
  `PrismaClient`; every query rewritten to `db.orm.public.Model.where(...).all()`
  style chains. The array form of `$transaction`, `$extends`, `Prisma.sql`,
  TypedSQL, `omit`, and scalar-list filters are gone.
- Missing in the RC and used by Peas: nested `set`, `connectOrCreate`, nested
  `upsert`/`deleteMany`, `increment`, `P2002`.
- New migration workflow (`migration plan`, `db migrate`, `db sign`, no seed
  command, no Studio in the CLI); requires PostgreSQL 15+ and Node 22.18+.
- After the dependency swap, fresh installs break until every query is
  rewritten (one-pass migration).

Sources: [Coming from Prisma 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7),
[6 or 7 to 8 on PostgreSQL](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql),
[supported versions](https://www.prisma.io/docs/orm/supported-versions).

## M1 proof of concept results

Run on 12 November 2026 in `/tmp/peas-prisma-poc` (outside the repository)
against disposable databases `peas_poc7` and `peas_poc8` on PostgreSQL 17.11,
Node 22.23.4. The development database was not touched. Both versions used
the same ontology-subset schema (FoodConcept, LexiconEntry, typed
FoodRelationship, IngredientMention with a JSON syntax tree, LexiconRevision,
DiscoveryEvidence); Prisma 8 read it unchanged through `prisma7Schema(...)`.

| Operation | Prisma 7.10.1 | Prisma 8.0.0-rc.33 / orm-postgres rc.23 |
| --- | --- | --- |
| Migrate an empty database from scratch | `migrate diff --from-empty` + `migrate deploy` | `contract emit` + `migration plan` + `db migrate` |
| 1. Create concepts | Pass | Pass |
| 2. Create lexicon entries (bulk) | Pass (`createMany`) | Pass (`createAndCount`) |
| 3. Typed relationships | Pass | Pass |
| 4. 200 mentions with JSON syntax | Pass (`createManyAndReturn`) | Pass (`createAll`) |
| 5. Nested relationship query with mention count | Pass | Pass (count lands on `mentions`, not `_count`) |
| 6. Multi-record decision in a transaction | Pass | Pass |
| 6b. Rollback on a mid-transaction unique violation | Pass | Pass |
| 7. Merge two concepts (no orphaned mentions) | Pass | Pass (flat statements; no nested `set`) |
| 8. Bulk mention update; evidence insert with conflict skip (50, then 0) | Pass | Pass |
| 9. Detect a unique violation | Pass (`P2002`) | Pass (`sqlState === "23505"`) |
| 10. Atomic increment | Pass (`{ increment: 1 }`) | Pass only via raw SQL |
| 11. Recursive ancestors (CTE) | Pass (`$queryRaw`) | Pass (`db.raw.sql` with typed `returnsRow`) |
| Strict `tsc` of the PoC | Clean | **Fails**: a required relation (`FoodRelationship.target`, non-null foreign key) is typed as possibly `null` |
| PoC size | 214 lines | 229 lines |

Other observations:

- Prisma 8 rc.23 returns `DateTime` as `Date` (the guide's string warning
  applied to rc.20). The development database's time zone is
  `America/Chicago`; Prisma 8 fills `@default(now())` on the database side,
  so `timestamp` columns would store local time unless the database is set to
  UTC.
- Prisma 8 RCs still ship breaking changes release to release; the official
  upgrade guide pins older RCs (rc.27 / rc.20) than the latest.
- Both versions handled every ontology operation; the difference is cost and
  risk, not capability.

## Decision

**Prisma 7.** It needs no query rewrites, typechecks cleanly, is GA with long
support, and closes the 19 November Prisma 6 security gap. Prisma 8 works for
the ontology subset but requires a full one-pass rewrite of every query, raw
SQL for increments, workarounds for nullable relation typing, and tracking a
moving RC.

To keep a later Prisma 8 move mechanical, the Phase 2 ontology repositories
use flat, transaction-scoped statements (no nested `set`, `connectOrCreate`,
or `increment`), a single unique-violation helper, and `LexiconRevision` as an
autoincrement row.

## M2 upgrade record (12 November 2026)

| Field | Value |
| --- | --- |
| Previous version | `@prisma/client` 6.11.1, `prisma` 6.15.0 (declared ^6.11.0) |
| New version | `@prisma/client` ^7.10.1, `prisma` ^7.10.1, `@prisma/adapter-pg` ^7.10.1, `pg` ^8.16.0 (installed 7.10.1 / 8.23.1) |
| Affected workspaces | `packages/database`, `apps/queue`; root `engines.node` raised to `>=22.12` |

Changes:

- `packages/database/prisma.config.ts` (new): schema path, migrations path,
  datasource URL and optional shadow URL; loads the root `.env.local` because
  Prisma 7 no longer loads env files.
- Schema header (`prisma/schema.prisma`, `scripts/build-schema.js`): the
  datasource `url` moved to the config; the unused `fullTextSearchPostgres`
  preview flag was removed. The generator stays `prisma-client-js` with its
  default output, so `@prisma/client` imports keep working.
- `src/client.ts`: clients are created through `createPrismaClient()` with
  the `PrismaPg` adapter; exported from `@peas/database`.
- `apps/queue/src/config/database.ts`: uses `createPrismaClient({ log })`
  instead of the removed `datasources` option.
- `apps/queue/.../track-completion/service.ts`: uses the shared client instead
  of constructing (and tearing down) a client per completion broadcast.
- Database scripts use `scripts/prisma-client.js` (adapter-based).
- `db:push` lost the removed `--skip-generate` flag; `verify-migrations.js`
  uses `--from-config-datasource` / `--to-schema` and points the config at the
  scratch database through `DATABASE_URL`.

Validation:

| Check | Result |
| --- | --- |
| `prisma migrate status` on the development database | Up to date (41 migrations) |
| `db:verify-migrations` on a scratch database | Migrations reproduce the schema exactly |
| Seed on a scratch database, run twice | Idempotent (37 categories, 72 tags, 14 recipe categories) |
| Runtime queries through `@peas/database` | Counts, nested includes, interactive transaction, raw SQL, `getNoteDetail`, `P2002` detection |
| Queue typecheck / tests | Clean / unchanged (4,406 pass; the same 9 pre-existing path-dependent failures) |
| Web typecheck and `next build` | Clean |
| Prisma inside the Next.js production server | Session lookup ran and redirected to `/login` with no errors |

Known remaining issues:

- The queue still runs two connection pools (`@peas/database` and
  `config/database.ts`); consolidating them is a behavior change left for a
  separate review.
- Unique-violation checks still mix `instanceof`, duck typing, and message
  matching; replace them with one helper when Phase 2 adds the ontology
  repositories.
- `pg` defaults differ from Prisma 6 (no connection timeout; invalid SSL
  certificates rejected). Check the hosted database's SSL setup before
  deploying.
- Nothing in deployment runs `prisma migrate deploy`; migrations are still
  applied by hand.

## Rollback

- Code: revert the upgrade change set (the user owns commits).
- Database: the upgrade does not alter the schema; `migrate status` must stay
  clean before and after. Take a `pg_dump` before switching migration tooling.
- Keep the Prisma 6 lockfile entries in the reverted state until the new
  version has run imports end to end.

## Open items

- Confirm PostgreSQL version on the hosted (Railway) database; Prisma 8
  requires 15+.
- `prisma-client-js` output-path requirements in 7.x conflict between the
  release notes and the generator reference; verify during the upgrade.

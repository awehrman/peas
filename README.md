<p align="center"><img src="docs/assets/peas/banner.svg" alt="A row of hand-drawn peas in greens, browns, lavender, brick red, and orange" width="100%"></p>

# Peas

Peas turns a pile of recipe notes into a structured, searchable cookbook. It imports exported notes, parses every ingredient line, resolves each ingredient against a food ontology that you teach as you go, and promotes the notes you like into recipes.

<p align="center"><img src="docs/assets/peas/divider.svg" alt="" width="100%"></p>

## Getting started

You need Node 22.22 or later, Yarn 4, and Postgres and Redis running locally (`brew services start postgresql@17 && brew services start redis`).

```bash
cp .env.local.example .env.local   # then fill in DATABASE_URL, Redis, and SIGN_UP_CODES
yarn install
yarn workspace @peas/database db:migrate
yarn workspace @peas/database db:seed:all
yarn dev
```

The web app runs on http://localhost:3100 and the queue on http://localhost:4200. Create your account through the invite link described in [SIGN_UP_CODES.md](apps/web/SIGN_UP_CODES.md).

## Starting over

```bash
yarn reset
```

Stop `yarn dev` first. `yarn reset` deletes everything an import or a review session can leave behind and then reseeds, so the next import starts from a clean slate. Only user accounts (and their sessions) are kept.

- **Deleted:** notes, ingredient and instruction lines, mentions, images, recipes, sources, categories, tags, queued jobs, reinterpretation runs, and all food knowledge (concepts, the lexicon, attributes, preparations, decisions, review cards, products, brands, ingredient tags, legacy mappings, and health snapshots). Redis work and cached lexicons, local uploads, and uploaded images in R2 go too.
- **Reseeded:** recipe categories and ingredient tags, the ontology vocabulary, modifiers, and the starter foods (`db:seed:all`).

For a narrower cleanup, such as clearing imports but keeping food knowledge, see [Clearing imports](apps/queue/README.md#clearing-imports).

<p align="center"><img src="docs/assets/peas/divider.svg" alt="" width="100%"></p>

## What's in here

| Workspace | What it does |
| --- | --- |
| [`apps/web`](apps/web) | The web app (TanStack Start, Apollo Client) |
| [`apps/queue`](apps/queue) | BullMQ workers that import notes, parse lines, process images, and reinterpret mentions |
| [`packages/api`](packages/api) | GraphQL schema and resolvers |
| [`packages/database`](packages/database) | Prisma schema, migrations, repositories, and seeds |
| [`packages/parser`](packages/parser) | Ingredient line parser and lexicon fixtures |
| [`packages/features`](packages/features) | Feature-level React components |
| [`packages/components`](packages/components) | Shared UI components |
| [`packages/pea-svg-generator`](packages/pea-svg-generator) | The peas on this page |
| `packages/theme`, `packages/tailwind`, `packages/storybook` | Design tokens, Tailwind config, and Storybook |
| `packages/eslint-config`, `packages/typescript-config` | Shared lint and TypeScript settings |

Testing is covered in [docs/testing.md](docs/testing.md), and design decisions live in [docs/architecture](docs/architecture).

The peas above are generated. To redraw them, run `yarn workspace @peas/pea-svg-generator generate:readme` (change the seeds in `packages/pea-svg-generator/scripts/readme-peas.ts` for a different handful).

<p align="center"><img src="docs/assets/peas/banner.svg" alt="" width="60%"></p>

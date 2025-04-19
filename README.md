# Peas Monorepo

A monorepo for the Peas project, built with Turborepo, Next.js, and other modern technologies.

## Structure

\`\`\`
peas/
├── apps/
│ ├── docs/ # Documentation site (Next.js)
│ ├── queue/ # BullMQ queue processor
│ └── web/ # Main web application (Next.js)
├── packages/
│ ├── auth/ # Authentication package with NextAuth.js
│ ├── components/ # Shared UI components with shadcn/ui
│ ├── database/ # Prisma database client and schema
│ ├── eslint-config/ # Shared ESLint configuration
| ├── evernote # Authenticate with Evernote
│ ├── parser/ # Recipe parser utility
│ └── ts-config/ # Shared TypeScript configuration
\`\`\`

## Getting Started

### Prerequisites

- Node.js 16+
- Yarn 3+
- PostgreSQL
- Redis (for queue processing)

### Environment Setup

1. Copy the example environment files:
   \`\`\`bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   cp apps/queue/.env.example apps/queue/.env
   cp packages/database/.env.example packages/database/.env
   cp packages/evernote/.env.example packages/evernote/.env
   \`\`\`

2. Update the environment variables with your own values. See [ENV_SETUP.md](ENV_SETUP.md) for details.

### Installation

\`\`\`bash

# Install dependencies

yarn install

# Generate Prisma client

yarn workspace @peas/database db:generate

# Push database schema to your database

yarn workspace @peas/database db:push

# Build all packages

yarn build
\`\`\`

### Development

\`\`\`bash

# Start all apps in development mode

yarn dev

# Start specific app or package

yarn workspace @peas/web dev
yarn workspace @peas/docs dev
yarn workspace @peas/queue dev
\`\`\`

### Testing

\`\`\`bash

# Run end-to-end tests

yarn test:e2e
\`\`\`

### Storybook

\`\`\`bash

# Start Storybook for component development

yarn workspace @peas/components storybook

# Build Storybook static site

yarn workspace @peas/components build-storybook

# Link Storybook to docs app

yarn storybook:build-and-link
\`\`\`

## Authentication

The web app uses GitHub OAuth for authentication. Set up your GitHub OAuth app and configure the environment variables as described in [ENV_SETUP.md](ENV_SETUP.md).

## License

[MIT](LICENSE)

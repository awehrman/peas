# `database`

A Prisma instance to help us talk to a PostgreSQL database. This was generated with `npx prisma init`.

## 🏗️ Modular Schema Structure

The Prisma schema is organized into modular files for better maintainability:

```text
prisma/
├── schema.prisma          # Main schema (auto-generated)
├── schemas/
│   ├── auth.prisma        # Authentication models (User, Account, Session)
│   ├── notes.prisma       # Note processing and status tracking
│   ├── queue.prisma       # Background job processing
│   ├── parsing.prisma     # Parsed content models
│   ├── meta.prisma        # Categories and tags
│   └── source.prisma      # Sources, URLs, and books
└── scripts/
    └── build-schema.js    # Schema combination script
```

### Schema Modules

- **`auth.prisma`**: User authentication and session management
  - `User`, `Account`, `Session`, `VerificationToken`œœ
  - `UserType` enum

- **`notes.prisma`**: Note processing and status tracking
  - `Note`, `EvernoteMetadata`, `NoteStatusEvent`
  - `NoteStatus`, `ErrorCode` enums

- **`queue.prisma`**: Background job processing
  - `QueueJob` model
  - `QueueJobStatus`, `QueueJobType` enums

- **`parsing.prisma`**: Parsed content from recipe notes
  - `ParsedIngredientLine`, `ParsedInstructionLine`, `ParsedSegment`

- **`meta.prisma`**: Categorization and tagging
  - `Category`, `Tag`

- **`source.prisma`**: Source tracking and references
  - `Source`, `URL`, `Book`
  - `SourceType` enum

## 🚀 Usage

### Development Workflow

1. **Edit modular schema files** in `prisma/schemas/`
2. **Build the combined schema**:

   ```bash
   npm run build:schema
   ```

3. **Generate Prisma client**:

   ```bash
   npm run db:generate
   ```

4. **Create a migration** (see below). Schema changes always go through `yarn db:migrate`; `db:push` is only for throwaway databases, because anything pushed without a migration is missing from every other environment.

### Prisma 7 notes

- Connection settings live in `prisma.config.ts` (not in the schema). The CLI reads `DATABASE_URL` from the environment or the root `.env.local`, and `SHADOW_DATABASE_URL` when set.
- Clients connect through the `pg` driver adapter. Create them with `createPrismaClient()` from `@peas/database` (or `scripts/prisma-client.js` in standalone scripts) rather than `new PrismaClient()`.
- `prisma migrate dev` and `db push` no longer run `prisma generate`; run `yarn build` (or `prisma generate`) after schema changes.

### Available Scripts

- `npm run build:schema` - Combine modular schema files
- `npm run db:generate` - Build schema and generate Prisma client
- `npm run db:migrate` - Build schema, create a migration, and apply it
- `npm run db:verify-migrations` - Replay all migrations on `SCRATCH_DATABASE_URL` and fail if they differ from the schema
- `npm run db:push` - Build schema and push to database (throwaway databases only)

### Adding New Schema Modules

1. Create a new `.prisma` file in `prisma/schemas/`
2. Add the file to the `schemaFiles` array in `scripts/build-schema.js`
3. Run `npm run build:schema` to test

## 📦 Migration & Deployment Workflow

### Creating a Migration

1. **Edit your modular schema files** in `prisma/schemas/` as needed.
2. **Build the combined schema**:

   ```bash
   npm run build:schema
   ```

3. **Create a new migration**:

   ```bash
   yarn db:migrate --name "your_migration_name"
   ```

   This will:
   - Generate a new migration in `migrations/` (next to the combined `schema.prisma`)
   - Apply it to your local/dev database
   - Update the Prisma client

### Applying Migrations to Production

1. **Push your code and migrations to your production environment**.
2. **Build the schema and deploy migrations**:

   ```bash
   npm run build:schema
   npx prisma migrate deploy
   ```

   This will apply all pending migrations to your production database.

### Resetting the Database (Development Only)

If you need to reset your dev database (e.g., after major schema changes):

```bash
npx prisma migrate reset --force
```

This will drop and recreate the database, apply all migrations, and regenerate the Prisma client.

## 📊 Database Schema

The application uses Prisma with PostgreSQL and includes:

- **User Management**: Authentication and user profiles
- **Note Processing**: Recipe content and metadata storage
- **Queue Jobs**: Background job tracking and error handling
- **Parsed Content**: Structured ingredient and instruction data
- **Error Tracking**: Comprehensive error logging and recovery

### Key Models

- `Note`: Recipe content and processing status
- `ParsedIngredientLine`: Extracted ingredient information
- `ParsedInstructionLine`: Processed instruction text
- `QueueJob`: Background job management
- `ParsedSegment`: Structured ingredient data

## 🔧 Development

Turbo will re-generate our schema, but you'll want to make sure you deploy your changes with:

```bash
yarn db:migrate
```

Use the prisma studio to view your database:

```bash
npx prisma studio
```

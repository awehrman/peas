import { existsSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env files; read the monorepo's .env.local unless
// the host already provides DATABASE_URL.
const rootEnv = join(import.meta.dirname, "../../.env.local");
if (!process.env.DATABASE_URL && existsSync(rootEnv)) {
  config({ path: rootEnv, quiet: true });
}

export default defineConfig({
  // Combined by scripts/build-schema.js from prisma/schemas/*.prisma
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    // `prisma generate` does not need a database, so a missing URL is allowed
    url: process.env.DATABASE_URL ?? "",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});

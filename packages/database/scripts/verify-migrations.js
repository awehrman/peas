#!/usr/bin/env node
/**
 * Replays every migration on a throwaway database and fails if the result
 * differs from schema.prisma. Catches schema changes applied with `db push`
 * that never got a migration.
 *
 * Requires SCRATCH_DATABASE_URL (its contents are destroyed). prisma.config.ts
 * reads DATABASE_URL, so each command runs with DATABASE_URL pointed at the
 * scratch database.
 */
import { execSync } from "node:child_process";

const scratchUrl = process.env.SCRATCH_DATABASE_URL;

if (!scratchUrl) {
  console.error("SCRATCH_DATABASE_URL must be set to a throwaway database.");
  process.exit(1);
}

if (scratchUrl === process.env.DATABASE_URL) {
  console.error("SCRATCH_DATABASE_URL must not point at DATABASE_URL.");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: scratchUrl };

function run(command, input) {
  execSync(command, {
    stdio: input ? ["pipe", "inherit", "inherit"] : "inherit",
    env,
    input,
  });
}

try {
  run(
    "prisma db execute --stdin",
    "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  );
  run("prisma migrate deploy");
  run(
    "prisma migrate diff --from-config-datasource --to-schema schema.prisma --exit-code"
  );
  console.log("Migrations reproduce schema.prisma exactly.");
} catch {
  console.error(
    "Migrations do not reproduce schema.prisma. Create a migration with `yarn db:migrate`."
  );
  process.exit(1);
}

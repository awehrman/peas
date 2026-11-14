import { seedE2eDatabase } from "./seed";

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const databasePackage = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../packages/database"
);

/** Applies pending migrations to TEST_DATABASE_URL and reseeds it before the run. */
export default async function globalSetup(): Promise<void> {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      'Set TEST_DATABASE_URL to a throwaway Postgres database (its name must contain "test") to run the e2e tests.'
    );
  }

  execSync("node scripts/build-schema.js", {
    cwd: databasePackage,
    stdio: "ignore",
  });
  execSync("npx prisma migrate deploy", {
    cwd: databasePackage,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: ["ignore", "ignore", "inherit"],
  });
  await seedE2eDatabase();
}

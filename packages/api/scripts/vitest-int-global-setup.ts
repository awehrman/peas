import { config } from "dotenv";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const databasePackage = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../database"
);

/**
 * Applies pending migrations to TEST_DATABASE_URL (never wipes it; each suite truncates what it uses). Refuses to run against the development database or any database whose name lacks "test".
 */
export default function setup(): void {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    console.log(
      "TEST_DATABASE_URL is not set; integration tests will be skipped."
    );
    return;
  }

  config({ path: join(databasePackage, "../../.env.local"), quiet: true });
  if (testUrl === process.env.DATABASE_URL)
    throw new Error("TEST_DATABASE_URL must not point at DATABASE_URL.");
  const databaseName = new URL(testUrl).pathname.replace(/^\//, "");
  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to use "${databaseName}": the test database name must contain "test".`
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
}

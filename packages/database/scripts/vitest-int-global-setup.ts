import { config } from "dotenv";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Wipes and migrates TEST_DATABASE_URL once before the integration suites. Refuses to run against the development database or any database whose name lacks "test".
 */
export default function setup(): void {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    console.log(
      "TEST_DATABASE_URL is not set; integration tests will be skipped."
    );
    return;
  }

  config({ path: join(packageDir, "../../.env.local"), quiet: true });
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must not point at DATABASE_URL.");
  }
  const databaseName = new URL(testUrl).pathname.replace(/^\//, "");
  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to wipe "${databaseName}": the test database name must contain "test".`
    );
  }

  const env = { ...process.env, DATABASE_URL: testUrl };
  execSync("node scripts/build-schema.js", {
    cwd: packageDir,
    stdio: "ignore",
  });
  execSync("prisma db execute --stdin", {
    cwd: packageDir,
    env,
    input: "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;",
    stdio: ["pipe", "ignore", "inherit"],
  });
  execSync("prisma migrate deploy", {
    cwd: packageDir,
    env,
    stdio: ["ignore", "ignore", "inherit"],
  });
}

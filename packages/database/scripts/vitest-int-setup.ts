/**
 * Runs in each integration test worker before any test module is imported, so the shared Prisma client (src/client.ts) connects to the test database.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

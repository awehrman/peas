/**
 * Runs in each test worker before modules load: points the shared Prisma client at the test database and removes R2 credentials so cleanupAllData can never touch real storage.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

for (const key of [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
]) {
  delete process.env[key];
}

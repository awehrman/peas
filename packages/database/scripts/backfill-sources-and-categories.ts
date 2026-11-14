/**
 * Backfill for the import-integrity expand migration (20261113080000): normalized URLs and canonical keys, legacy book lookups, category slugs, note hashes and SimHash bands, duplicate candidates from earlier flags, and primary sources. Idempotent; run with --dry-run first and keep the report.
 *
 *   yarn workspace @peas/database db:backfill:import-integrity --dry-run
 *   yarn workspace @peas/database db:backfill:import-integrity [--batch 500]
 *
 * Take a pg_dump before the real run (see docs/architecture/import-integrity.md).
 */
import { prisma } from "../src/client.js";
import { backfillImportIntegrity } from "../src/repository/import-integrity-backfill.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const batch = Number.parseInt(argument("--batch") ?? "500", 10);
  const report = await backfillImportIntegrity({
    dryRun,
    batchSize: Number.isInteger(batch) && batch > 0 ? batch : 500,
    log: (message) => console.log(`[backfill] ${message}`),
  });
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

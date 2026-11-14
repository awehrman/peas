/**
 * Clears everything a (partial) import leaves behind, so an export can be
 * re-imported from scratch:
 *   - imported data in Postgres (notes, ingredient lines and mentions, images,
 *     status events, recipes, open review cards with no lines left); users,
 *     food knowledge, decisions, and health snapshots are kept
 *   - queued and cached work in Redis (bull:*, action:*, tag:*, and with
 *     --include-ontology the cached lexicon snapshots, lexicon:snapshot:*)
 *   - local upload folders, including processed images kept on disk
 *
 * With --include-ontology, food knowledge goes too: concepts, ingredient-rule
 * categories, the lexicon, attributes, preparations, decisions, every review
 * card, products, brands, ingredient tags, legacy ingredient mappings, and
 * health snapshots. Reseed afterwards (db:seed:all).
 *
 * With --include-r2, uploaded images in Cloudflare R2 (originals/, processed/)
 * are deleted too.
 *
 * Stop `yarn dev` first, then:
 *   yarn workspace @peas/queue clear-imports --yes [--include-ontology] [--include-r2]
 * or, for everything plus the seeds, `yarn reset` from the repository root.
 */
import { cleanupAllData } from "@peas/database";
import { readdirSync, rmSync } from "fs";
import { createConnection } from "net";
import { join } from "path";
import { createClient } from "redis";

import "../src/config/load-env";
import { getLocalImageRoot } from "../src/services/image/local-storage";
import { R2Service } from "../src/services/r2";

const REDIS_PATTERNS = ["bull:*", "action:*", "tag:*"];
const LEXICON_SNAPSHOT_PATTERN = "lexicon:snapshot:*";
const R2_PREFIXES = ["originals/", "processed/"];
const QUEUE_PORT = Number(process.env.PORT ?? 4200);

function uploadDirectories(): string[] {
  return [
    ...["uploads/images", "uploads/temp", "uploads/processed"].map(
      (directory) => join(process.cwd(), directory)
    ),
    getLocalImageRoot(),
  ];
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function clearRedis(patterns: string[]): Promise<number> {
  const client = createClient({
    socket: {
      host: process.env.REDISHOST || "127.0.0.1",
      port: Number(process.env.REDISPORT || 6379),
    },
    username: process.env.REDISUSER || undefined,
    password: process.env.REDISPASSWORD || undefined,
  });
  await client.connect();

  let deleted = 0;
  for (const pattern of patterns) {
    const keys: string[] = [];
    for await (const batch of client.scanIterator({
      MATCH: pattern,
      COUNT: 500,
    })) {
      keys.push(...(Array.isArray(batch) ? batch : [batch]));
    }
    if (keys.length > 0) deleted += await client.del(keys);
  }

  await client.quit();
  return deleted;
}

function clearUploads(): number {
  let removed = 0;
  for (const path of uploadDirectories()) {
    let entries: string[] = [];
    try {
      entries = readdirSync(path);
    } catch {
      continue;
    }
    for (const entry of entries) {
      rmSync(join(path, entry), { recursive: true, force: true });
      removed++;
    }
  }
  return removed;
}

async function clearR2(): Promise<string> {
  const r2 = R2Service.fromEnvironment();
  if (!r2) return "not configured, skipped";

  let deleted = 0;
  let errors = 0;
  for (const prefix of R2_PREFIXES) {
    const result = await r2.deletePrefix(prefix);
    deleted += result.deleted;
    errors += result.errors;
  }
  return `deleted ${deleted} objects` + (errors ? ` (${errors} failed)` : "");
}

async function main() {
  const includeOntology = process.argv.includes("--include-ontology");
  const includeR2 = process.argv.includes("--include-r2");
  if (!process.argv.includes("--yes")) {
    console.log(
      "This deletes all imported notes, ingredient lines and their mentions, images, recipes, sources,\n" +
        "note categories and tags, queued jobs, reinterpretation runs, local uploads, and open review\n" +
        "cards left with no example lines.\n" +
        (includeOntology
          ? "--include-ontology also deletes food knowledge: concepts, ingredient-rule categories, the\n" +
            "lexicon, attributes, preparations, decisions, every review card, products, brands, ingredient\n" +
            "tags, legacy ingredient mappings, and corpus health snapshots. Only users are kept.\n"
          : "Kept: users, food knowledge (concepts, lexicon, attributes, relationships), decisions,\n" +
            "resolved and rejected review cards, and corpus health snapshots (add --include-ontology to\n" +
            "delete those too).\n") +
        (includeR2
          ? `--include-r2 also deletes uploaded images in R2 (${R2_PREFIXES.join(", ")}).\n`
          : "R2 is kept (add --include-r2 to delete uploaded images there too).\n") +
        "Re-run with --yes to continue."
    );
    process.exit(1);
  }

  if (await isPortInUse(QUEUE_PORT)) {
    console.error(
      `The queue is still running on port ${QUEUE_PORT}; stop yarn dev first so it doesn't re-queue work.`
    );
    process.exit(1);
  }

  const { deletedCounts } = await cleanupAllData({ includeOntology });
  console.log("Database:", deletedCounts);

  const redisPatterns = includeOntology
    ? [...REDIS_PATTERNS, LEXICON_SNAPSHOT_PATTERN]
    : REDIS_PATTERNS;
  console.log(`Redis: deleted ${await clearRedis(redisPatterns)} keys`);
  console.log(`Uploads: removed ${clearUploads()} entries`);
  if (includeR2) console.log(`R2: ${await clearR2()}`);
  if (includeOntology)
    console.log(
      "Food knowledge cleared. Reseed with: yarn workspace @peas/database db:seed:all"
    );
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to clear imports:", error);
  process.exit(1);
});

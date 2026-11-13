/**
 * Clears everything a (partial) import leaves behind, so an export can be
 * re-imported from scratch:
 *   - imported data in Postgres (notes, ingredient lines and mentions, images,
 *     status events, recipes, open review cards with no lines left); users,
 *     food knowledge, decisions, and health snapshots are kept
 *   - queued and cached work in Redis (bull:*, action:*, tag:*, and with
 *     --include-ontology the cached lexicon snapshots, lexicon:snapshot:*)
 *   - local upload folders
 *
 * With --include-ontology, food knowledge goes too: concepts, the lexicon,
 * attributes, preparations, decisions, every review card, products, brands,
 * ingredient tags, legacy ingredient mappings, and health snapshots. Reseed
 * afterwards (db:seed:ontology, db:seed:modifiers, db:seed:foods).
 *
 * Stop `yarn dev` first, then:
 *   yarn workspace @peas/queue clear-imports --yes [--include-ontology]
 */
import { cleanupAllData } from "@peas/database";
import { readdirSync, rmSync } from "fs";
import { createConnection } from "net";
import { join } from "path";
import { createClient } from "redis";

import "../src/config/load-env";

const REDIS_PATTERNS = ["bull:*", "action:*", "tag:*"];
const LEXICON_SNAPSHOT_PATTERN = "lexicon:snapshot:*";
const UPLOAD_DIRECTORIES = ["uploads/images", "uploads/temp"];
const QUEUE_PORT = Number(process.env.PORT ?? 4200);

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
  for (const directory of UPLOAD_DIRECTORIES) {
    const path = join(process.cwd(), directory);
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

async function main() {
  const includeOntology = process.argv.includes("--include-ontology");
  if (!process.argv.includes("--yes")) {
    console.log(
      "This deletes all imported notes, ingredient lines and their mentions, images, recipes, sources,\n" +
        "note categories and tags, queued jobs, reinterpretation runs, and open review cards left with\n" +
        "no example lines.\n" +
        (includeOntology
          ? "--include-ontology also deletes food knowledge: concepts, the lexicon, attributes, preparations,\n" +
            "decisions, every review card, products, brands, ingredient tags, legacy ingredient mappings,\n" +
            "and corpus health snapshots. Only users are kept.\n"
          : "Kept: users, food knowledge (concepts, lexicon, attributes, relationships), decisions,\n" +
            "resolved and rejected review cards, and corpus health snapshots (add --include-ontology to\n" +
            "delete those too).\n") +
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
  if (includeOntology)
    console.log(
      "Food knowledge cleared. Reseed with: yarn workspace @peas/database db:seed:ontology && yarn workspace @peas/database db:seed:modifiers && yarn workspace @peas/database db:seed:foods"
    );
  console.log(
    "Done. R2 isn't touched; use Delete All Data on the dashboard for that."
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to clear imports:", error);
  process.exit(1);
});

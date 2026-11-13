/**
 * Clears everything a (partial) import leaves behind, so an export can be
 * re-imported from scratch:
 *   - imported data in Postgres (notes, ingredient lines and mentions, images,
 *     status events, recipes, open review cards with no lines left); users,
 *     food knowledge, decisions, and health snapshots are kept
 *   - queued and cached work in Redis (bull:*, action:*, tag:*)
 *   - local upload folders
 *
 * Stop `yarn dev` first, then:
 *   yarn workspace @peas/queue clear-imports --yes
 */
import "../src/config/load-env";

import { readdirSync, rmSync } from "fs";
import { createConnection } from "net";
import { join } from "path";

import { cleanupAllData } from "@peas/database";
import { createClient } from "redis";

const REDIS_PATTERNS = ["bull:*", "action:*", "tag:*"];
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

async function clearRedis(): Promise<number> {
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
  for (const pattern of REDIS_PATTERNS) {
    const keys: string[] = [];
    for await (const batch of client.scanIterator({ MATCH: pattern, COUNT: 500 })) {
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
  if (!process.argv.includes("--yes")) {
    console.log(
      "This deletes all imported notes, ingredient lines and their mentions, images, recipes, sources,\n" +
        "note categories and tags, queued jobs, reinterpretation runs, the legacy v1 parsing rules,\n" +
        "and open review cards left with no example lines.\n" +
        "Kept: users, food knowledge (concepts, lexicon, attributes, relationships), decisions,\n" +
        "resolved and rejected review cards, and corpus health snapshots.\n" +
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

  const { deletedCounts } = await cleanupAllData();
  console.log("Database:", deletedCounts);

  console.log(`Redis: deleted ${await clearRedis()} keys`);
  console.log(`Uploads: removed ${clearUploads()} entries`);
  console.log("Done. R2 isn't touched; use Delete All Data on the dashboard for that.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to clear imports:", error);
  process.exit(1);
});

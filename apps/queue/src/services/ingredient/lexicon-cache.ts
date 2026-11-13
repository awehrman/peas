import { getCurrentRevision, loadResolverSnapshot } from "@peas/database";
import {
  type ResolverContext,
  type ResolverSnapshot,
  ResolverSnapshotSchema,
  buildResolverContext,
} from "@peas/parser/v2";

import { redisConnection } from "../../config/redis";
import type { StructuredLogger } from "../../types";

/** How long a cached context is trusted before the revision is checked again. */
export const LEXICON_TTL_MS = 15_000;

/** Redis channel the queue listens on for lexicon changes (payload: the new revision). */
export const LEXICON_REVISION_CHANNEL = "lexicon:revision";

const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24;

export function snapshotKey(revision: number): string {
  return `lexicon:snapshot:${revision}`;
}

/** The Redis calls the cache needs, so tests can pass a fake. */
export interface SnapshotStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
}

export interface LexiconCacheDependencies {
  getRevision: () => Promise<number>;
  loadSnapshot: () => Promise<ResolverSnapshot>;
  store?: SnapshotStore | null;
  now?: () => number;
  ttlMs?: number;
}

export interface LexiconCache {
  /** The resolver context for the current lexicon revision (decision D8: every cache keys on the revision). */
  getResolverContext(logger?: StructuredLogger): Promise<ResolverContext>;
  /** Mark the cached context stale; the next call checks the revision and rebuilds only if it changed. */
  invalidate(): void;
}

/**
 * Keeps one resolver context per process (Phase 5b). Within `ttlMs` the cached context is returned as is; after that the revision is read, and only a changed revision loads a new snapshot (Redis first, then the database, which then fills Redis) and rebuilds the context.
 *
 * @example
 * const cache = createLexiconCache({ getRevision: getCurrentRevision, loadSnapshot: loadResolverSnapshot });
 * processIngredientLine(line, await cache.getResolverContext(logger));
 */
export function createLexiconCache({
  getRevision,
  loadSnapshot,
  store = null,
  now = Date.now,
  ttlMs = LEXICON_TTL_MS,
}: LexiconCacheDependencies): LexiconCache {
  let cached: { context: ResolverContext; checkedAt: number } | null = null;
  let building: Promise<ResolverContext> | null = null;

  async function snapshotFor(revision: number): Promise<ResolverSnapshot> {
    const stored = await store?.get(snapshotKey(revision)).catch(() => null);
    if (stored) {
      const parsed = ResolverSnapshotSchema.safeParse(JSON.parse(stored));
      if (parsed.success && parsed.data.revision === revision)
        return parsed.data;
    }
    const snapshot = await loadSnapshot();
    await store
      ?.set(snapshotKey(snapshot.revision), JSON.stringify(snapshot), {
        EX: SNAPSHOT_TTL_SECONDS,
      })
      .catch(() => undefined);
    return snapshot;
  }

  async function refresh(logger?: StructuredLogger): Promise<ResolverContext> {
    const revision = await getRevision();
    if (cached && cached.context.revision === revision) {
      cached = { context: cached.context, checkedAt: now() };
      return cached.context;
    }
    const startedAt = now();
    const context = buildResolverContext(await snapshotFor(revision));
    cached = { context, checkedAt: now() };
    logger?.log(
      `[LEXICON_CACHE] revision=${context.revision} entries=${context.entries.size} buildMs=${now() - startedAt}`
    );
    return context;
  }

  return {
    async getResolverContext(logger) {
      if (cached && now() - cached.checkedAt < ttlMs) return cached.context;
      building ??= refresh(logger).finally(() => {
        building = null;
      });
      return building;
    },
    invalidate() {
      if (cached)
        cached = {
          context: cached.context,
          checkedAt: Number.NEGATIVE_INFINITY,
        };
    },
  };
}

export const lexiconCache = createLexiconCache({
  getRevision: () => getCurrentRevision(),
  loadSnapshot: () => loadResolverSnapshot(),
  store: redisConnection,
});

export function getResolverContext(
  logger?: StructuredLogger
): Promise<ResolverContext> {
  return lexiconCache.getResolverContext(logger);
}

/** Tells every queue process that the lexicon changed (the API calls this through POST /reinterpret/lexicon-revision). */
export async function publishLexiconRevision(revision: number): Promise<void> {
  lexiconCache.invalidate();
  await redisConnection.publish(LEXICON_REVISION_CHANNEL, String(revision));
}

/**
 * Drops the cached context whenever another process publishes a new revision. The TTL stays as a fallback when Redis is unavailable. Returns an unsubscribe function for shutdown.
 *
 * @example
 * const stop = await subscribeToLexiconRevisions(logger);
 */
export async function subscribeToLexiconRevisions(
  logger: StructuredLogger,
  cache: LexiconCache = lexiconCache
): Promise<() => Promise<void>> {
  const subscriber = redisConnection.duplicate();
  await subscriber.connect();
  await subscriber.subscribe(LEXICON_REVISION_CHANNEL, (message) => {
    cache.invalidate();
    logger.log(`[LEXICON_CACHE] invalidated by revision=${message}`);
  });
  return async () => {
    await subscriber.unsubscribe(LEXICON_REVISION_CHANNEL);
    await subscriber.quit();
  };
}

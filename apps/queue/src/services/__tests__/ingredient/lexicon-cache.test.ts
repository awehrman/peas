import { fixtureSnapshot } from "./v2-fixture";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { redisConnection } from "../../../config/redis";
import {
  LEXICON_REVISION_CHANNEL,
  LEXICON_TTL_MS,
  type SnapshotStore,
  createLexiconCache,
  getResolverContext,
  lexiconCache,
  publishLexiconRevision,
  snapshotKey,
  subscribeToLexiconRevisions,
} from "../../ingredient/lexicon-cache";

const subscriber = {
  connect: vi.fn(async () => undefined),
  subscribe: vi.fn(
    async (_channel: string, _listener: (message: string) => void) => undefined
  ),
  unsubscribe: vi.fn(async () => undefined),
  quit: vi.fn(async () => undefined),
};

vi.mock("../../../config/redis", () => ({
  redisConnection: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => "OK"),
    publish: vi.fn(async () => 1),
    duplicate: vi.fn(() => subscriber),
  },
}));

vi.mock("@peas/database", () => ({
  getCurrentRevision: vi.fn(async () => 7),
  loadResolverSnapshot: vi.fn(async () => fixtureSnapshot),
}));

const logger = { log: vi.fn() };

function harness({ revision = 7, store = null as SnapshotStore | null } = {}) {
  let now = 1_000;
  let currentRevision = revision;
  const getRevision = vi.fn(async () => currentRevision);
  const loadSnapshot = vi.fn(async () => ({
    ...fixtureSnapshot,
    revision: currentRevision,
  }));
  const cache = createLexiconCache({
    getRevision,
    loadSnapshot,
    store,
    now: () => now,
  });
  return {
    cache,
    getRevision,
    loadSnapshot,
    advance: (ms: number) => {
      now += ms;
    },
    setRevision: (next: number) => {
      currentRevision = next;
    },
  };
}

describe("createLexiconCache", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serves the cached context within the TTL, then rechecks the revision without rebuilding", async () => {
    const { cache, getRevision, loadSnapshot, advance } = harness();
    const first = await cache.getResolverContext(logger);
    expect(await cache.getResolverContext(logger)).toBe(first);
    expect(getRevision).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\[LEXICON_CACHE\] revision=7 entries=2 buildMs=\d+$/
      )
    );

    advance(LEXICON_TTL_MS + 1);
    expect(await cache.getResolverContext(logger)).toBe(first);
    expect(getRevision).toHaveBeenCalledTimes(2);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it("rebuilds when the revision changes, and an invalidation rechecks the revision before the TTL is up", async () => {
    const { cache, getRevision, loadSnapshot, advance, setRevision } =
      harness();
    const first = await cache.getResolverContext();
    setRevision(8);
    advance(LEXICON_TTL_MS + 1);
    const second = await cache.getResolverContext();
    expect(second.revision).toBe(8);
    expect(second).not.toBe(first);

    cache.invalidate();
    expect(await cache.getResolverContext()).toBe(second);
    expect(getRevision).toHaveBeenCalledTimes(3);
    expect(loadSnapshot).toHaveBeenCalledTimes(2);

    setRevision(9);
    cache.invalidate();
    expect((await cache.getResolverContext()).revision).toBe(9);
  });

  it("shares one build between concurrent callers", async () => {
    const { cache, loadSnapshot } = harness();
    const [a, b] = await Promise.all([
      cache.getResolverContext(),
      cache.getResolverContext(),
    ]);
    expect(a).toBe(b);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it("reads the snapshot from Redis when present and writes it there otherwise", async () => {
    const stored = new Map<string, string>([
      [snapshotKey(7), JSON.stringify(fixtureSnapshot)],
    ]);
    const store: SnapshotStore = {
      get: vi.fn(async (key: string) => stored.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => stored.set(key, value)),
    };
    const hit = harness({ store });
    expect((await hit.cache.getResolverContext()).revision).toBe(7);
    expect(hit.loadSnapshot).not.toHaveBeenCalled();

    const miss = harness({ revision: 9, store });
    await miss.cache.getResolverContext();
    expect(miss.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(store.set).toHaveBeenCalledWith(
      snapshotKey(9),
      expect.stringContaining('"revision":9'),
      { EX: 86_400 }
    );
  });

  it("ignores unusable stored snapshots and Redis errors", async () => {
    const store: SnapshotStore = {
      get: vi.fn(async () =>
        JSON.stringify({ ...fixtureSnapshot, revision: 3 })
      ),
      set: vi.fn(async () => {
        throw new Error("redis down");
      }),
    };
    const { cache, loadSnapshot } = harness({ store });
    expect((await cache.getResolverContext()).revision).toBe(7);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it("falls back to the database when Redis cannot be read, or when there is no store", async () => {
    const failing: SnapshotStore = {
      get: vi.fn(async () => {
        throw new Error("redis down");
      }),
      set: vi.fn(async () => "OK"),
    };
    const { cache, loadSnapshot } = harness({ store: failing });
    expect((await cache.getResolverContext()).revision).toBe(7);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
    expect(failing.set).toHaveBeenCalled();

    const storeless = createLexiconCache({
      getRevision: async () => 7,
      loadSnapshot: async () => fixtureSnapshot,
    });
    expect((await storeless.getResolverContext()).revision).toBe(
      fixtureSnapshot.revision
    );
  });
});

describe("process-wide cache and revision broadcasts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds the shared context from the database and publishes revisions", async () => {
    lexiconCache.invalidate();
    expect((await getResolverContext(logger)).revision).toBe(7);

    await publishLexiconRevision(8);
    expect(redisConnection.publish).toHaveBeenCalledWith(
      LEXICON_REVISION_CHANNEL,
      "8"
    );
  });

  it("invalidates the cache when another process announces a revision, and unsubscribes on shutdown", async () => {
    const cache = { getResolverContext: vi.fn(), invalidate: vi.fn() };
    const stop = await subscribeToLexiconRevisions(logger, cache);
    const listener = subscriber.subscribe.mock.calls[0]?.[1];
    listener?.("12");
    expect(cache.invalidate).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "[LEXICON_CACHE] invalidated by revision=12"
    );

    await stop();
    expect(subscriber.unsubscribe).toHaveBeenCalledWith(
      LEXICON_REVISION_CHANNEL
    );
    expect(subscriber.quit).toHaveBeenCalled();
  });
});

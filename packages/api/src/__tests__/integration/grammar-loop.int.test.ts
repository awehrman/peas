import {
  createNote,
  createUser,
  execute,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import {
  backfillMentions,
  loadResolverContext,
  prisma,
  seedOntologyVocabulary,
} from "@peas/database";
import { PARSER_VERSION } from "@peas/parser/v2";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { AuthUser } from "../../auth/session.js";
import { createApiServer } from "../../server.js";

const curation = vi.hoisted(() => ({ isOpen: true }));
vi.mock("../../context.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../context.js")>();
  return {
    ...actual,
    canCurateKnowledge: (
      viewer: Parameters<typeof actual.canCurateKnowledge>[0]
    ) => curation.isOpen || actual.isAdmin(viewer),
  };
});

const server = createApiServer({ development: false });

const TRENDS = `
  {
    corpusHealthTrends(weeks: 4) {
      parserVersion
      snapshots { trigger parserVersion totalMentions unresolvedMentions openDiscoveries }
      byParserVersion { parserVersion total unresolved }
      reviewByWeek { weekStart decisions }
      topUnknownPhrases { phrase }
    }
  }
`;

const STRUCTURAL = `
  {
    discoveryQueue(type: STRUCTURAL_PATTERN) {
      items { id key fixtureBlock }
    }
  }
`;

async function resetOntology(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation",
      "Discovery", "LexiconDecision", "IngredientMention", "CorpusHealthSnapshot" RESTART IDENTITY CASCADE
  `);
}

function queueAnswers(body: unknown) {
  const fetchMock = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status: 202 })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe.skipIf(!hasTestDatabase)(
  "Grammar loop resolvers (integration)",
  () => {
    let cook: AuthUser;
    let admin: AuthUser;

    beforeEach(async () => {
      await resetDatabase();
      await resetOntology();
      await seedOntologyVocabulary();
      curation.isOpen = true;
      cook = await createUser({ username: "cook" });
      admin = await createUser({ username: "boss", admin: true });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    afterAll(async () => {
      await resetOntology();
      await server.stop();
      await prisma.$disconnect();
    });

    it("keeps the health page and grammar controls to admins when curation is restricted", async () => {
      curation.isOpen = false;
      const trends = await execute(server, cook, TRENDS);
      expect(trends.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

      for (const mutation of [
        `mutation { startReparse { success message } }`,
        `mutation { runExploratorySweep { success message } }`,
        `mutation { takeHealthSnapshot { success message } }`,
        `mutation { markDiscoveryAsNoise(id: "x") { success message } }`,
      ]) {
        const result = await execute<
          Record<string, { success: boolean; message: string }>
        >(server, cook, mutation);
        expect(Object.values(result.data ?? {})[0]).toEqual({
          success: false,
          message: "You can't teach Peas yet",
        });
      }
    });

    it("exports a structural pattern as fixtures, marks it as noise, and charts snapshots", async () => {
      await createNote("Glazed Ham", ["For the glaze:", "1 cup milk"]);
      await backfillMentions(await loadResolverContext());

      const queue = await execute<{
        discoveryQueue: {
          items: { id: string; key: string; fixtureBlock: string | null }[];
        };
      }>(server, admin, STRUCTURAL);
      const heading = queue.data?.discoveryQueue.items.find(
        (item) => item.key === "W :"
      );
      expect(heading).toBeDefined();
      const cases = JSON.parse(heading!.fixtureBlock!) as {
        id: string;
        input: string;
        tags: string[];
        current: string;
      }[];
      expect(cases).toEqual([
        expect.objectContaining({
          id: "pending-w-colon-1",
          input: "For the glaze:",
          tags: ["pending"],
          current: expect.any(String),
        }),
      ]);

      const empty = await execute<{
        corpusHealthTrends: { parserVersion: string; snapshots: unknown[] };
      }>(server, admin, TRENDS);
      expect(empty.data?.corpusHealthTrends).toMatchObject({
        parserVersion: PARSER_VERSION,
        snapshots: [],
      });

      const snapshot = await execute<{
        takeHealthSnapshot: {
          success: boolean;
          effect: { invalidatedDomains: string[] };
        };
      }>(
        server,
        admin,
        `mutation { takeHealthSnapshot { success effect { invalidatedDomains } } }`
      );
      expect(snapshot.data?.takeHealthSnapshot).toEqual({
        success: true,
        effect: { invalidatedDomains: ["CORPUS_HEALTH"] },
      });

      const noise = await execute<{
        markDiscoveryAsNoise: {
          success: boolean;
          linesDeactivated: number;
          effect: { invalidatedDomains: string[] };
        };
      }>(
        server,
        admin,
        `mutation ($id: ID!) { markDiscoveryAsNoise(id: $id) { success linesDeactivated effect { invalidatedDomains } } }`,
        { id: heading!.id }
      );
      expect(noise.data?.markDiscoveryAsNoise).toMatchObject({
        success: true,
        linesDeactivated: 1,
      });
      expect(
        noise.data?.markDiscoveryAsNoise.effect.invalidatedDomains
      ).toEqual(expect.arrayContaining(["DISCOVERIES", "CORPUS_HEALTH"]));

      const again = await execute<{
        markDiscoveryAsNoise: { success: boolean };
      }>(
        server,
        admin,
        `mutation { markDiscoveryAsNoise(id: "00000000-0000-4000-8000-000000000000") { success } }`
      );
      expect(again.data?.markDiscoveryAsNoise.success).toBe(false);

      await execute(
        server,
        admin,
        `mutation { takeHealthSnapshot { success } }`
      );
      const trends = await execute<{
        corpusHealthTrends: {
          snapshots: {
            trigger: string;
            totalMentions: number;
            openDiscoveries: number;
          }[];
          byParserVersion: { parserVersion: string; total: number }[];
        };
      }>(server, admin, TRENDS);
      const [before, after] = trends.data!.corpusHealthTrends.snapshots;
      expect(before).toMatchObject({ trigger: "MANUAL" });
      expect(after!.openDiscoveries).toBe(before!.openDiscoveries - 1);
      expect(after!.totalMentions).toBeLessThan(before!.totalMentions);
      expect(
        trends.data!.corpusHealthTrends.byParserVersion.length
      ).toBeGreaterThan(0);
    });

    it("starts a reparse and a sweep on the queue and tracks the reparse's progress", async () => {
      const fetchMock = queueAnswers({
        success: true,
        jobId: `reparse-${PARSER_VERSION}`,
        status: "PENDING",
      });
      const reparse = await execute<{
        startReparse: {
          success: boolean;
          jobId: string;
          effect: { reprocessingJobId: string | null };
        };
      }>(
        server,
        admin,
        `mutation { startReparse { success jobId effect { reprocessingJobId } } }`
      );
      expect(reparse.data?.startReparse).toEqual({
        success: true,
        jobId: `reparse-${PARSER_VERSION}`,
        effect: { reprocessingJobId: `reparse-${PARSER_VERSION}` },
      });
      expect(String(fetchMock.mock.calls[0]![0])).toBe(
        "http://127.0.0.1:9/reinterpret/reparse"
      );

      queueAnswers({
        success: true,
        jobId: `reparse-${PARSER_VERSION}`,
        status: "COMPLETED",
      });
      const done = await execute<{
        startReparse: {
          message: string;
          effect: { reprocessingJobId: string | null };
        };
      }>(
        server,
        admin,
        `mutation { startReparse { message effect { reprocessingJobId } } }`
      );
      expect(done.data?.startReparse).toEqual({
        message: `Parser ${PARSER_VERSION} has already reparsed the corpus`,
        effect: { reprocessingJobId: null },
      });

      const sweepFetch = queueAnswers({
        success: true,
        jobId: "exploratory-sweep-1",
      });
      const sweep = await execute<{
        runExploratorySweep: { success: boolean; jobId: string };
      }>(server, admin, `mutation { runExploratorySweep { success jobId } }`);
      expect(sweep.data?.runExploratorySweep).toEqual({
        success: true,
        jobId: "exploratory-sweep-1",
      });
      expect(String(sweepFetch.mock.calls[0]![0])).toBe(
        "http://127.0.0.1:9/reinterpret/sweep"
      );
    });

    it("reports an unreachable queue as a failed payload", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("down", { status: 503 }))
      );
      for (const field of ["startReparse", "runExploratorySweep"]) {
        const result = await execute<
          Record<string, { success: boolean; message: string }>
        >(server, admin, `mutation { ${field} { success message } }`);
        expect(result.data?.[field]?.success).toBe(false);
        expect(result.data?.[field]?.message).toMatch(/queue answered 503/);
      }
    });
  }
);

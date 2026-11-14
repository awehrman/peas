import { failure, toFailurePayload } from "./payload";
import { type DiscoveryParent, currentResolverContext } from "./teach-views";
import { idSchema } from "./validation";

import {
  type CorpusHealthSnapshotRecord,
  getHealthTrends,
  markDiscoveryAsNoise,
  pendingFixtureLines,
  takeCorpusHealthSnapshot,
} from "@peas/database";
import {
  PARSER_VERSION,
  describeSyntax,
  draftGoldenCases,
  processIngredientLine,
} from "@peas/parser/v2";
import { GraphQLError } from "graphql";
import { z } from "zod";

import { type ApiContext, FORBIDDEN, canCurateKnowledge, requireViewer } from "../context";
import { createMutationEffect } from "../effects";
import type {
  CorpusHealthSnapshot,
  MutationResolvers,
  QueryResolvers,
} from "../generated/resolvers-types";
import { postToQueue } from "../queue-client";

const FIXTURE_LIMIT = 10;
const weeksSchema = z.number().int().min(1).max(104);

function requireCurator(context: ApiContext) {
  const viewer = requireViewer(context);
  if (!canCurateKnowledge(viewer))
    throw new GraphQLError("You can't teach Peas yet", {
      extensions: { code: FORBIDDEN },
    });
  return viewer;
}

function toSnapshot(record: CorpusHealthSnapshotRecord): CorpusHealthSnapshot {
  const status = (key: string) => record.byResolutionStatus[key] ?? 0;
  return {
    id: record.id,
    takenAt: record.takenAt,
    trigger: record.trigger,
    parserVersion: record.parserVersion,
    lexiconRevision: record.lexiconRevision,
    totalLines: record.totalLines,
    totalMentions: record.totalMentions,
    autoResolvedMentions: status("AUTO_RESOLVED"),
    needsReviewMentions: status("NEEDS_REVIEW"),
    unresolvedMentions: status("UNRESOLVED"),
    verifiedMentions: record.verifiedCount,
    avgCandidates: record.avgCandidates,
    openDiscoveries: Object.values(record.openDiscoveriesByType).reduce(
      (sum, count) => sum + count,
      0
    ),
  };
}

/**
 * A structural pattern's example lines as pending golden cases (Phase 6a "Export as fixtures"), the same JSON `pull:fixtures` writes. Null for other discovery types or when no line shows the pattern any more.
 *
 * @example
 * await fixtureBlockFor({ id, type: "STRUCTURAL_PATTERN", key: "W N U W" }) // '[\n  {\n    "id": "pending-w-n-u-w-1", ...'
 */
export async function fixtureBlockFor(
  discovery: Pick<DiscoveryParent, "id" | "type" | "key">
): Promise<string | null> {
  if (discovery.type !== "STRUCTURAL_PATTERN") return null;
  const lines = await pendingFixtureLines({
    discoveryId: discovery.id,
    limit: FIXTURE_LIMIT,
  });
  if (lines.length === 0) return null;
  const context = await currentResolverContext();
  const cases = draftGoldenCases(
    discovery.key,
    lines.map((line) => ({
      input: line.input,
      current: describeSyntax(processIngredientLine(line.input, context).line),
    }))
  );
  return JSON.stringify(cases, null, 2);
}

/**
 * The health page (Phase 6e): stored snapshots and live breakdowns.
 */
export const GrammarLoopQuery: Pick<QueryResolvers, "corpusHealthTrends"> = {
  corpusHealthTrends: async (_parent, { weeks }, context) => {
    requireCurator(context);
    const trends = await getHealthTrends({
      weeks: weeksSchema.catch(12).parse(weeks ?? 12),
    });
    return {
      parserVersion: PARSER_VERSION,
      snapshots: trends.snapshots.map(toSnapshot),
      byParserVersion: Object.entries(trends.byParserVersion).map(
        ([parserVersion, counts]) => ({ parserVersion, ...counts })
      ),
      reviewByWeek: trends.reviewByWeek,
      topUnknownPhrases: trends.topUnknownPhrases,
      mostAmbiguousPhrases: trends.mostAmbiguousPhrases,
    };
  },
};

/**
 * The grammar loop's controls (Phase 6a, 6c, 6e, 6f): mark a structural pattern as noise, reparse after a grammar change, run an exploratory sweep, and take a health snapshot.
 */
export const GrammarLoopMutation: Pick<
  MutationResolvers,
  | "markDiscoveryAsNoise"
  | "startReparse"
  | "runExploratorySweep"
  | "takeHealthSnapshot"
> = {
  markDiscoveryAsNoise: async (_parent, { id }, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer)) return failure("You can't teach Peas yet");
    try {
      const discoveryId = idSchema.parse(id);
      const { linesDeactivated } = await markDiscoveryAsNoise(discoveryId);
      return {
        __typename: "MarkNoisePayload",
        success: true,
        linesDeactivated,
        effect: createMutationEffect({
          changed: [{ typename: "Discovery", id: discoveryId }],
          invalidatedDomains: [
            "DISCOVERIES",
            "NOTE_DETAIL",
            "MENTIONS",
            "DASHBOARD_STATS",
            "CORPUS_HEALTH",
          ],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  startReparse: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer)) return failure("You can't teach Peas yet");
    try {
      const { jobId, status } = await postToQueue<{
        jobId: string;
        status: string;
      }>("/reinterpret/reparse", {}, viewer.id);
      return {
        __typename: "StartJobPayload",
        success: true,
        jobId,
        message:
          status === "COMPLETED"
            ? `Parser ${PARSER_VERSION} has already reparsed the corpus`
            : `Reparsing lines from older parser versions with ${PARSER_VERSION}`,
        effect: createMutationEffect({
          invalidatedDomains: ["CORPUS_HEALTH"],
          reprocessingJobId: status === "COMPLETED" ? null : jobId,
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  runExploratorySweep: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer)) return failure("You can't teach Peas yet");
    try {
      const { jobId } = await postToQueue<{ jobId: string }>(
        "/reinterpret/sweep",
        {},
        viewer.id
      );
      return {
        __typename: "StartJobPayload",
        success: true,
        jobId,
        message:
          "Sweep started; new discoveries appear in the review queue when it finishes",
        effect: createMutationEffect({}),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  takeHealthSnapshot: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer)) return failure("You can't teach Peas yet");
    try {
      await takeCorpusHealthSnapshot("MANUAL");
      return {
        __typename: "BasicPayload",
        success: true,
        message: "Snapshot taken",
        effect: createMutationEffect({ invalidatedDomains: ["CORPUS_HEALTH"] }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },
};

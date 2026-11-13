import { getCorpusHealth, getCurrentRevision } from "@peas/database";
import { GraphQLError } from "graphql";

import { FORBIDDEN, canCurateKnowledge, requireViewer } from "../context";
import type { QueryResolvers } from "../generated/resolvers-types";
import { fetchLiveParseMetrics } from "../queue-client";

/**
 * The Corpus health card on /teach (Phase 5g): database counts plus the queue's live parse window when the queue answers.
 */
export const CorpusHealthQuery: Pick<QueryResolvers, "corpusHealth"> = {
  corpusHealth: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer))
      throw new GraphQLError("You can't teach Peas yet", {
        extensions: { code: FORBIDDEN },
      });

    const [corpus, lexiconRevision, live] = await Promise.all([
      getCorpusHealth(),
      getCurrentRevision(),
      fetchLiveParseMetrics(viewer.id),
    ]);
    return {
      lineCount: corpus.lineCount,
      linesWithMentions: corpus.linesWithMentions,
      parsedSuccessfully: corpus.parsedSuccessfully,
      parsedWithErrors: corpus.parsedWithErrors,
      awaitingParsing: corpus.awaitingParsing,
      mentions: {
        total: corpus.mentions.total,
        autoResolved: corpus.mentions.AUTO_RESOLVED,
        needsReview: corpus.mentions.NEEDS_REVIEW,
        unresolved: corpus.mentions.UNRESOLVED,
        verified: corpus.mentions.VERIFIED,
      },
      openDiscoveryCount: corpus.openDiscoveryCount,
      topUnknownPhrases: corpus.topUnknownPhrases,
      reinterpretBacklog: corpus.reinterpretBacklog,
      lexiconRevision,
      live,
    };
  },
};

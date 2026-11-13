import { fixtureBlockFor } from "./grammar-loop";
import { failure, toFailurePayload } from "./payload";
import {
  candidateViews,
  currentResolverContext,
  describeDecision,
  describeDiscoveries,
  mentionView,
  resolutionView,
  syntaxTokens,
} from "./teach-views";
import {
  MAX_SEARCH_QUERY_LENGTH,
  idSchema,
  toFilter,
  toPage,
} from "./validation";

import {
  OntologyError,
  addDecisionMentionsChanged,
  applyDecision,
  deferDiscovery,
  getAttributeVocabulary,
  getConceptDecisions,
  getConceptDetail,
  getConceptMentions,
  getConceptRefs,
  getDiscoveryCounts,
  getDiscoveryDetail,
  getDiscoveryQueue,
  getMentionDetail,
  getMentionDetailsForLine,
  listConcepts,
  listLexiconEntries,
  loadResolverSnapshot,
  previewDecision,
  prisma,
  refreshDiscoveries,
  reinterpretAffected,
  searchConcepts,
} from "@peas/database";
import {
  DEGREE_KEYS,
  INSTRUCTION_KEYS,
  LEXICON_ROLES,
  MEASUREMENT_MODIFIER_KEYS,
  buildResolverContext,
  describeQuantity,
  describeSyntax,
  processIngredientLine,
  summarizeResolution,
} from "@peas/parser/v2";
import { GraphQLError, GraphQLScalarType, valueFromASTUntyped } from "graphql";
import { ZodError, z } from "zod";

import { type ApiContext, FORBIDDEN, canCurateKnowledge, requireViewer } from "../context";
import { KNOWLEDGE_DOMAINS, createMutationEffect } from "../effects";
import type {
  MutationResolvers,
  QueryResolvers,
  Resolvers,
} from "../generated/resolvers-types";
import {
  notifyLexiconRevision,
  requestBackgroundReinterpret,
} from "../queue-client";

const CONCEPTS_PAGE_SIZE = 50;
const MAX_PLAYGROUND_LINE_LENGTH = 500;
const REINTERPRET_LIMIT = 1000;

const BAD_USER_INPUT = "BAD_USER_INPUT";

function requireCurator(context: ApiContext) {
  const viewer = requireViewer(context);
  if (!canCurateKnowledge(viewer))
    throw new GraphQLError("You can't teach Peas yet", {
      extensions: { code: FORBIDDEN },
    });
  return viewer;
}

/** Validation and ontology errors in queries become readable GraphQL errors; anything else propagates. */
function toQueryError(error: unknown): never {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    throw new GraphQLError(
      issue
        ? `${issue.path.join(".") || "payload"}: ${issue.message}`
        : "Invalid payload",
      {
        extensions: { code: BAD_USER_INPUT },
      }
    );
  }
  if (error instanceof OntologyError)
    throw new GraphQLError(error.message, {
      extensions: { code: BAD_USER_INPUT },
    });
  throw error;
}

const limitSchema = z.number().int().min(1).max(100);
const lexiconRoleSchema = z.enum(LEXICON_ROLES);

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Any JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast, variables) =>
    valueFromASTUntyped(ast, variables ?? undefined),
});

export const TeachQuery: Pick<
  QueryResolvers,
  | "discoveryQueue"
  | "discoveryCounts"
  | "discovery"
  | "concepts"
  | "lexicon"
  | "concept"
  | "searchConcepts"
  | "vocabulary"
  | "playground"
  | "previewDecision"
  | "mention"
> = {
  discoveryQueue: async (_parent, args, context) => {
    requireCurator(context);
    const page = await getDiscoveryQueue({
      type: args.type ?? undefined,
      cursor: args.cursor ?? null,
      limit: args.limit ? limitSchema.parse(args.limit) : 25,
    });
    return {
      items: await describeDiscoveries(page.items),
      nextCursor: page.nextCursor,
    };
  },

  discoveryCounts: async (_parent, _args, context) => {
    requireCurator(context);
    const counts = await getDiscoveryCounts();
    return Object.entries(counts).map(([type, count]) => ({
      type: type as keyof typeof counts,
      count: count ?? 0,
    }));
  },

  discovery: async (_parent, { id }, context) => {
    requireCurator(context);
    const detail = await getDiscoveryDetail(idSchema.parse(id), {
      exampleLimit: 0,
    });
    if (!detail) return null;
    const [described] = await describeDiscoveries([detail]);
    return described ?? null;
  },

  lexicon: async (_parent, args, context) => {
    requireCurator(context);
    const page = toPage(args.page);
    const role = lexiconRoleSchema.safeParse(args.role).data;
    const { items, total } = await listLexiconEntries({
      query: toFilter(args.query),
      role,
      includeRetired: args.includeRetired ?? false,
      offset: (page - 1) * CONCEPTS_PAGE_SIZE,
      limit: CONCEPTS_PAGE_SIZE,
    });
    return { items, total, page, pageSize: CONCEPTS_PAGE_SIZE };
  },

  concepts: async (_parent, args, context) => {
    requireCurator(context);
    const page = toPage(args.page);
    const { items, total } = await listConcepts({
      query: toFilter(args.query),
      offset: (page - 1) * CONCEPTS_PAGE_SIZE,
      limit: CONCEPTS_PAGE_SIZE,
    });
    return { items, total, page, pageSize: CONCEPTS_PAGE_SIZE };
  },

  concept: async (_parent, { id }, context) => {
    const viewer = requireViewer(context);
    const detail = await getConceptDetail(idSchema.parse(id));
    if (!detail) return null;
    const [mentions, decisions] = await Promise.all([
      getConceptMentions(detail.id),
      canCurateKnowledge(viewer) ? getConceptDecisions(detail.id) : [],
    ]);
    const inheritedIds = detail.classifications.flatMap((row) =>
      row.source === "INHERITED" ? [row.inheritedFromConceptId] : []
    );
    const refs = new Map(
      (
        await getConceptRefs([
          ...inheritedIds,
          ...detail.substitutions.map((row) => row.conceptId),
          ...(detail.mergedIntoId ? [detail.mergedIntoId] : []),
        ])
      ).map((ref) => [ref.id, ref])
    );
    const relationship = (edge: (typeof detail.parents)[number]) => ({
      id: edge.id,
      type: edge.type,
      status: edge.status,
      concept: {
        id: edge.conceptId,
        canonicalName: edge.canonicalName,
        status: "VERIFIED" as const,
      },
    });

    return {
      id: detail.id,
      slug: detail.slug,
      canonicalName: detail.canonicalName,
      status: detail.status,
      description: detail.description,
      isComposed: detail.isComposed,
      mergedInto: detail.mergedIntoId
        ? (refs.get(detail.mergedIntoId) ?? null)
        : null,
      entries: detail.entries.map((entry) => ({
        id: entry.id,
        text: entry.text,
        kind: entry.kind,
        status: entry.status,
      })),
      parents: detail.parents.map(relationship),
      children: detail.children.map(relationship),
      attributes: detail.attributes,
      classifications: detail.classifications.map((row) => ({
        key: row.key,
        kind: row.kind,
        value: row.value,
        source: row.source,
        inheritedFrom:
          row.source === "INHERITED"
            ? (refs.get(row.inheritedFromConceptId) ?? null)
            : null,
        isExplicit: detail.explicitClassificationKeys.includes(row.key),
      })),
      tags: detail.tags,
      substitutions: detail.substitutions.map((row) => ({
        concept: refs.get(row.conceptId) ?? {
          id: row.conceptId,
          canonicalName: row.canonicalName,
          status: "VERIFIED" as const,
        },
        ratio: row.ratio,
        note: row.note,
      })),
      mentions,
      decisions: decisions.map((decision) => ({
        ...decision,
        reverted: decision.revertedById !== null,
      })),
    };
  },

  searchConcepts: async (_parent, { query }, context) => {
    requireViewer(context);
    if (query.length > MAX_SEARCH_QUERY_LENGTH) return [];
    return searchConcepts(query, { limit: 10 });
  },

  vocabulary: async (_parent, _args, context) => {
    requireCurator(context);
    const vocabulary = await getAttributeVocabulary();
    return {
      definitions: vocabulary.definitions.map((definition) => ({
        id: definition.id,
        key: definition.key,
        name: definition.name,
      })),
      attributeValues: vocabulary.definitions.flatMap((definition) =>
        definition.values.map((value) => ({
          ...value,
          definitionId: definition.id,
          definitionKey: definition.key,
          definitionName: definition.name,
        }))
      ),
      preparations: vocabulary.preparations,
      degreeKeys: [...DEGREE_KEYS],
      measurementModifierKeys: [...MEASUREMENT_MODIFIER_KEYS],
      instructionKeys: [...INSTRUCTION_KEYS],
    };
  },

  playground: async (_parent, { line, mode }, context) => {
    requireCurator(context);
    const text = line.slice(0, MAX_PLAYGROUND_LINE_LENGTH);
    const resolverContext = await currentResolverContext();
    const parseMode = mode ?? "CONSERVATIVE";
    const result = processIngredientLine(text, resolverContext, {
      mode: parseMode,
    });
    return {
      line: text,
      revision: resolverContext.revision,
      mode: parseMode,
      syntax: text.trim() ? describeSyntax(result.line) : "",
      alternativeCount: result.alternatives.length,
      mentions: result.mentions.map((mention) => {
        const segment = result.line.segments[mention.segmentIndex];
        return {
          segmentIndex: mention.segmentIndex,
          partIndex: mention.partIndex,
          span: mention.span,
          status: mention.status,
          quantity: segment?.quantity
            ? describeQuantity(segment.quantity)
            : null,
          tokens: segment ? syntaxTokens(segment, mention.span) : [],
          candidates: candidateViews(mention.resolution, resolverContext),
          unresolved: mention.resolution.unresolved,
          summary: resolutionView(
            summarizeResolution(mention, resolverContext)
          ),
        };
      }),
    };
  },

  previewDecision: async (_parent, { payload }, context) => {
    const viewer = requireCurator(context);
    try {
      const preview = await previewDecision(payload, { userId: viewer.id });
      return {
        ...preview,
        examples: preview.examples.map((example) => ({
          ...example,
          before: resolutionView(example.before),
          after: resolutionView(example.after),
        })),
      };
    } catch (error) {
      return toQueryError(error);
    }
  },

  mention: async (_parent, { id }, context) => {
    requireViewer(context);
    const detail = await getMentionDetail(idSchema.parse(id));
    return detail ? mentionView(detail, await currentResolverContext()) : null;
  },
};

const applyDecisionInputSchema = z.object({ discoveryId: idSchema.nullish() });

/**
 * What every applied decision needs next: reinterpret the mentions it affects (up to 1,000 lines in the request; above that a background run whose job id comes back), tell the queue about the new revision, and count the changed mentions on the decision for "taught to fixed".
 *
 * @example
 * const { reinterpreted, reprocessingJobId } = await followUpDecision(applied, viewer.id);
 */
export async function followUpDecision(
  applied: Awaited<ReturnType<typeof applyDecision>>,
  userId: string
): Promise<{
  reinterpreted: Awaited<ReturnType<typeof reinterpretAffected>>;
  reprocessingJobId: string | null;
}> {
  const reinterpreted = await reinterpretAffected(applied.payload, {
    limit: REINTERPRET_LIMIT,
  });
  await addDecisionMentionsChanged(
    { id: applied.decisionId },
    reinterpreted.mentionsChanged
  );
  void notifyLexiconRevision(applied.revision, userId);
  const reprocessingJobId = reinterpreted.needsBackgroundReinterpret
    ? await requestBackgroundReinterpret(
        applied.revision,
        reinterpreted.scope,
        userId
      ).catch(() => null)
    : null;
  return { reinterpreted, reprocessingJobId };
}

export const TeachMutation: Pick<
  MutationResolvers,
  "applyDecision" | "deferDiscovery" | "refreshDiscoveries"
> = {
  applyDecision: async (_parent, { input }, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer))
      return {
        ...failure("You can't teach Peas yet"),
        needsBackgroundReinterpret: false,
      };

    try {
      const { discoveryId } = applyDecisionInputSchema.parse(input);
      const applied = await applyDecision({
        payload: input.payload,
        userId: viewer.id,
        discoveryId: discoveryId ?? null,
      });
      const { reinterpreted, reprocessingJobId } = await followUpDecision(
        applied,
        viewer.id
      );
      const evicted =
        applied.payload.type === "MERGE_CONCEPTS"
          ? [
              { typename: "Concept", id: applied.payload.mergedId },
              { typename: "ConceptSummary", id: applied.payload.mergedId },
            ]
          : [];

      return {
        __typename: "ApplyDecisionPayload",
        success: true,
        decisionId: applied.decisionId,
        revision: applied.revision,
        summary: await describeDecision(applied.payload),
        mentionsUpdated: reinterpreted.mentionsChanged,
        needsBackgroundReinterpret: reinterpreted.needsBackgroundReinterpret,
        reinterpretCommand:
          reinterpreted.needsBackgroundReinterpret && !reprocessingJobId
            ? `yarn workspace @peas/queue reinterpret --revision ${applied.revision} --decision ${applied.decisionId}`
            : null,
        effect: createMutationEffect({
          changed: discoveryId
            ? [{ typename: "Discovery", id: discoveryId }]
            : [],
          evicted,
          invalidatedDomains: [...KNOWLEDGE_DOMAINS],
          lexiconRevision: applied.revision,
          reprocessingJobId,
        }),
      };
    } catch (error) {
      return { ...toFailurePayload(error), needsBackgroundReinterpret: false };
    }
  },

  deferDiscovery: async (_parent, { id }, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer)) return failure("You can't teach Peas yet");

    try {
      const discoveryId = idSchema.parse(id);
      await deferDiscovery(discoveryId);
      return {
        __typename: "BasicPayload",
        success: true,
        effect: createMutationEffect({
          changed: [{ typename: "Discovery", id: discoveryId }],
          invalidatedDomains: ["DISCOVERIES"],
        }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },

  refreshDiscoveries: async (_parent, _args, context) => {
    const viewer = requireViewer(context);
    if (!canCurateKnowledge(viewer)) return failure("You can't teach Peas yet");

    try {
      const result = await prisma.$transaction(
        async (tx) =>
          refreshDiscoveries(
            tx,
            buildResolverContext(await loadResolverSnapshot(tx))
          ),
        { timeout: 120_000 }
      );
      return {
        __typename: "RefreshDiscoveriesPayload",
        success: true,
        ...result,
        effect: createMutationEffect({ invalidatedDomains: ["DISCOVERIES"] }),
      };
    } catch (error) {
      return toFailurePayload(error);
    }
  },
};

export const teachTypeResolvers: Pick<
  Resolvers,
  "JSON" | "Discovery" | "IngredientLine"
> = {
  JSON: JSONScalar,

  Discovery: {
    fixtureBlock: (parent) => fixtureBlockFor(parent),
    examples: async (parent, args) => {
      const limit = args.limit ? limitSchema.parse(args.limit) : 20;
      const offset = Math.max(0, args.offset ?? 0);
      const detail = await getDiscoveryDetail(parent.id, {
        exampleLimit: limit,
        exampleOffset: offset,
      });
      return (detail?.examples ?? []).map((example) => ({
        mentionId: example.mentionId,
        noteId: example.noteId,
        noteTitle: example.noteTitle,
        lineText: example.lineText,
        span: {
          start: example.spanStart,
          end: example.spanEnd,
          text: example.lineText.slice(example.spanStart, example.spanEnd),
        },
      }));
    },
  },

  IngredientLine: {
    mentions: async (parent) => {
      const details = await getMentionDetailsForLine(parent.id);
      if (details.length === 0) return [];
      const resolverContext = await currentResolverContext();
      return details.map((detail) => mentionView(detail, resolverContext));
    },
  },
};

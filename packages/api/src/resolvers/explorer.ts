import {
  type OccurrenceFilter,
  OntologyError,
  type UsageOptions,
  getConceptDistributions,
  getConceptNeighborhood,
  getConceptOccurrenceFacets,
  getConceptRefs,
  getConceptUsage,
  getCorpusAnalyticsSnapshot,
  getObservedForms,
  listConceptOccurrences,
} from "@peas/database";
import { GraphQLError } from "graphql";
import { z } from "zod";

import { requireViewer } from "../context";
import type {
  Concept,
  ConceptOccurrenceFilter,
  ConceptRef,
  FoodRelationshipType,
  InputMaybe,
  QueryResolvers,
  Resolvers,
} from "../generated/resolvers-types";

/** The concept as the `concept` query returns it; usage, forms, and distributions are resolved only when asked for. */
export type ConceptParent = Omit<
  Concept,
  "usage" | "observedForms" | "distributions"
>;

const BAD_USER_INPUT = "BAD_USER_INPUT";
const DEFAULT_OCCURRENCE_LIMIT = 50;
const occurrenceLimitSchema = z.number().int().min(1).max(100);
const attributeSchema = z
  .string()
  .regex(/^[a-z0-9_]+:[a-z0-9_]+$/, 'attribute must look like "bone:boneless"');
const conceptIdSchema = z.uuid();
const COUNTED_STATUSES = ["AUTO_RESOLVED", "VERIFIED", "NEEDS_REVIEW"] as const;

function badInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: BAD_USER_INPUT } });
}

function conceptId(id: string): string {
  const parsed = conceptIdSchema.safeParse(id);
  if (!parsed.success) throw badInput("conceptId must be a concept id");
  return parsed.data;
}

function usageOptions(args: {
  expand?: InputMaybe<FoodRelationshipType[]>;
  includeNeedsReview?: InputMaybe<boolean>;
}): UsageOptions {
  return {
    ...(args.expand ? { expand: [...new Set(args.expand)] } : {}),
    includeNeedsReview: args.includeNeedsReview ?? false,
  };
}

/**
 * Validates the GraphQL filter and turns it into the repository's.
 *
 * @example
 * occurrenceFilter({ attribute: "bone:boneless", status: "VERIFIED" })
 * // { includeNeedsReview: false, attribute: { definitionKey: "bone", valueKey: "boneless" }, status: "VERIFIED" }
 */
function occurrenceFilter(
  filter: InputMaybe<ConceptOccurrenceFilter> | undefined
): OccurrenceFilter {
  if (!filter) return {};
  const status = filter.status ?? undefined;
  if (status && !(COUNTED_STATUSES as readonly string[]).includes(status))
    throw badInput("status must be AUTO_RESOLVED, VERIFIED, or NEEDS_REVIEW");
  const attribute = filter.attribute
    ? attributeSchema.safeParse(filter.attribute)
    : null;
  if (attribute && !attribute.success)
    throw badInput(attribute.error.issues[0]?.message ?? "Invalid attribute");
  const [definitionKey = "", valueKey = ""] = attribute?.data?.split(":") ?? [];
  return {
    ...usageOptions(filter),
    ...(filter.preparationKey ? { preparationKey: filter.preparationKey } : {}),
    ...(attribute ? { attribute: { definitionKey, valueKey } } : {}),
    ...(filter.sourceId ? { sourceId: filter.sourceId } : {}),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(status ? { status: status as (typeof COUNTED_STATUSES)[number] } : {}),
  };
}

async function refsById(ids: string[]): Promise<Map<string, ConceptRef>> {
  return new Map(
    (await getConceptRefs([...new Set(ids)])).map((ref) => [ref.id, ref])
  );
}

export const ExplorerQuery: Pick<
  QueryResolvers,
  | "conceptOccurrences"
  | "conceptOccurrenceFacets"
  | "corpusAnalytics"
  | "conceptGraph"
> = {
  conceptGraph: async (_parent, args, context) => {
    requireViewer(context);
    const depth = args.depth ?? 2;
    if (!Number.isInteger(depth) || depth < 1 || depth > 3)
      throw badInput("depth must be 1, 2, or 3");
    return getConceptNeighborhood(conceptId(args.conceptId), {
      depth,
      ...(args.types ? { types: [...new Set(args.types)] } : {}),
      direction: args.direction ?? "BOTH",
    });
  },

  corpusAnalytics: async (_parent, _args, context) => {
    requireViewer(context);
    const analytics = await getCorpusAnalyticsSnapshot();
    const rank = (row: (typeof analytics.topDirect)[number]) => ({
      concept: {
        id: row.conceptId,
        canonicalName: row.canonicalName,
        status: row.status,
      },
      directMentions: row.directMentions,
      directNotes: row.directNotes,
      expandedMentions: row.expandedMentions,
    });
    return {
      ...analytics,
      topDirect: analytics.topDirect.map(rank),
      topExpanded: analytics.topExpanded.map(rank),
      rare: analytics.rare.map(rank),
    };
  },

  conceptOccurrences: async (_parent, args, context) => {
    requireViewer(context);
    const limit = args.limit
      ? occurrenceLimitSchema.parse(args.limit)
      : DEFAULT_OCCURRENCE_LIMIT;
    try {
      const page = await listConceptOccurrences(
        conceptId(args.conceptId),
        occurrenceFilter(args.filter),
        { after: args.after ?? null, limit }
      );
      const refs = await refsById(page.items.map((item) => item.conceptId));
      return {
        items: page.items.map((item) => ({
          mentionId: item.mentionId,
          lineId: item.lineId,
          lineText: item.lineText,
          span: item.span,
          noteId: item.noteId,
          noteTitle: item.noteTitle,
          recipeId: item.recipeId,
          recipeTitle: item.recipeTitle,
          concept: refs.get(item.conceptId) ?? {
            id: item.conceptId,
            canonicalName: item.conceptName,
            status: "VERIFIED" as const,
          },
          path: item.path,
          status: item.resolutionStatus,
          preparations: item.preparations,
          attributes: item.attributes,
        })),
        total: page.total,
        nextCursor: page.hasNextPage ? page.endCursor : null,
      };
    } catch (error) {
      if (error instanceof OntologyError) throw badInput(error.message);
      throw error;
    }
  },

  conceptOccurrenceFacets: async (_parent, args, context) => {
    requireViewer(context);
    return getConceptOccurrenceFacets(
      conceptId(args.conceptId),
      usageOptions(args)
    );
  },
};

export const explorerTypeResolvers: Pick<Resolvers, "Concept"> = {
  Concept: {
    usage: async (parent, args) => {
      const usage = await getConceptUsage(parent.id, usageOptions(args));
      const refs = await refsById(
        usage.contributors.map((row) => row.conceptId)
      );
      return {
        ...usage,
        contributors: usage.contributors.map((row) => ({
          concept: refs.get(row.conceptId) ?? {
            id: row.conceptId,
            canonicalName: row.canonicalName,
            status: "VERIFIED" as const,
          },
          path: row.path,
          depth: row.depth,
          counts: row.counts,
        })),
      };
    },
    observedForms: (parent, args) =>
      getObservedForms(parent.id, {
        includeNeedsReview: args.includeNeedsReview ?? false,
      }),
    distributions: (parent, args) =>
      getConceptDistributions(parent.id, usageOptions(args)),
  },
};

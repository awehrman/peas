import { requireCurator } from "./teach";
import { toPage } from "./validation";

import {
  OntologyError,
  getLexiconEntryDetail,
  getUnknownExpressionSources,
  listLexiconEntryOccurrences,
  listUnknownExpressions,
} from "@peas/database";
import { GraphQLError } from "graphql";
import { z } from "zod";

import type {
  LexiconEntryDetail,
  MentionStatus,
  QueryResolvers,
  Resolvers,
} from "../generated/resolvers-types";

/** The entry as the `lexiconEntry` query returns it; occurrences are resolved only when asked for. */
export type LexiconEntryDetailParent = Omit<LexiconEntryDetail, "occurrences">;

const UNKNOWN_PAGE_SIZE = 50;
const DEFAULT_OCCURRENCE_LIMIT = 50;
const limitSchema = z.number().int().min(1).max(100);
const uuidSchema = z.uuid();

export const LexiconExplorerQuery: Pick<
  QueryResolvers,
  "lexiconEntry" | "unknownExpressions" | "unknownExpressionSources"
> = {
  lexiconEntry: async (_parent, { id }, context) => {
    requireCurator(context);
    if (!uuidSchema.safeParse(id).success) return null;
    return getLexiconEntryDetail(id);
  },

  unknownExpressions: async (_parent, args, context) => {
    requireCurator(context);
    const page = toPage(args.page);
    const { items, total } = await listUnknownExpressions({
      type: args.type ?? undefined,
      sourceId: args.sourceId ?? undefined,
      offset: (page - 1) * UNKNOWN_PAGE_SIZE,
      limit: UNKNOWN_PAGE_SIZE,
    });
    return { items, total, page, pageSize: UNKNOWN_PAGE_SIZE };
  },

  unknownExpressionSources: async (_parent, _args, context) => {
    requireCurator(context);
    return getUnknownExpressionSources();
  },
};

export const lexiconExplorerTypeResolvers: Pick<
  Resolvers,
  "LexiconEntryDetail"
> = {
  LexiconEntryDetail: {
    occurrences: async (parent, args) => {
      try {
        const page = await listLexiconEntryOccurrences(parent.id, {
          after: args.after ?? null,
          limit: args.limit
            ? limitSchema.parse(args.limit)
            : DEFAULT_OCCURRENCE_LIMIT,
        });
        return {
          ...page,
          items: page.items.map((item) => ({
            ...item,
            status: item.status as MentionStatus,
          })),
        };
      } catch (error) {
        if (error instanceof OntologyError)
          throw new GraphQLError(error.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        throw error;
      }
    },
  },
};

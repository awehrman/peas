import {
  getDashboardStats,
  getImportStats,
  getIngredientCategoryNames,
  getIngredientCounts,
  getIngredientDetail,
  getIngredientSummaries,
  getNoteDetail,
  getNotesPage,
  getQueueJobByJobId,
  getRecipeDetail,
  getRecipeTaxonomyOptions,
  getRecipesPage,
  searchIngredients,
} from "@peas/database";

import { requireViewer } from "../context";
import type { QueryResolvers } from "../generated/resolvers-types";
import { MAX_SEARCH_QUERY_LENGTH, toFilter, toPage } from "./validation";

export const Query: QueryResolvers = {
  viewer: (_parent, _args, context) => context.viewer,

  notes: (_parent, args, context) => {
    requireViewer(context);
    return getNotesPage({
      status: args.status ?? undefined,
      query: toFilter(args.query),
      page: toPage(args.page),
    });
  },

  note: (_parent, { id }, context) => {
    requireViewer(context);
    return getNoteDetail(id);
  },

  importStats: (_parent, _args, context) => {
    requireViewer(context);
    return getImportStats();
  },

  dashboardStats: (_parent, _args, context) => {
    requireViewer(context);
    return getDashboardStats();
  },

  job: async (_parent, { jobId }, context) => {
    requireViewer(context);
    const job = await getQueueJobByJobId(jobId);
    if (!job) return null;

    return {
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      noteId: job.noteId,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  },

  recipes: (_parent, args, context) => {
    requireViewer(context);
    return getRecipesPage({
      query: toFilter(args.query),
      category: toFilter(args.category),
      tag: toFilter(args.tag),
      page: toPage(args.page),
    });
  },

  recipe: (_parent, { id }, context) => {
    requireViewer(context);
    return getRecipeDetail(id);
  },

  recipeTaxonomy: (_parent, _args, context) => {
    requireViewer(context);
    return getRecipeTaxonomyOptions();
  },

  ingredients: (_parent, { view }, context) => {
    requireViewer(context);
    return getIngredientSummaries(view);
  },

  ingredientCounts: (_parent, _args, context) => {
    requireViewer(context);
    return getIngredientCounts();
  },

  ingredient: (_parent, { id }, context) => {
    requireViewer(context);
    return getIngredientDetail(id);
  },

  ingredientCategoryNames: (_parent, _args, context) => {
    requireViewer(context);
    return getIngredientCategoryNames();
  },

  searchIngredients: (_parent, { query, excludeId }, context) => {
    requireViewer(context);
    if (query.length > MAX_SEARCH_QUERY_LENGTH) return [];
    return searchIngredients(query, excludeId ?? undefined);
  },
};

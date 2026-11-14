import { toFilter, toPage } from "./validation";

import {
  getConceptRefs,
  getDashboardStats,
  getImportStats,
  getNoteDetail,
  getNotesPage,
  getQueueJobByJobId,
  getRecipeDetail,
  getRecipeTaxonomyOptions,
  getRecipesPage,
  getReinterpretRun,
} from "@peas/database";

import { z } from "zod";

import { requireViewer } from "../context";
import type { QueryResolvers } from "../generated/resolvers-types";

const conceptIdSchema = z.uuid();

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
    if (job) {
      return {
        jobId: job.jobId,
        type: job.type,
        status: job.status,
        noteId: job.noteId,
        processedCount: null,
        totalCount: null,
        errorMessage: job.errorMessage,
        retryCount: job.retryCount,
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
      };
    }

    const run = await getReinterpretRun(jobId);
    if (!run) return null;
    return {
      jobId: run.jobId,
      type: "REINTERPRET",
      status: run.status,
      noteId: null,
      processedCount: run.processedLines,
      totalCount: run.totalLines,
      errorMessage: run.errorMessage,
      retryCount: run.failedBatches,
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
    };
  },

  recipes: async (_parent, args, context) => {
    requireViewer(context);
    const conceptId = conceptIdSchema.safeParse(args.conceptId).data;
    const [page, concepts] = await Promise.all([
      getRecipesPage({
        query: toFilter(args.query),
        category: toFilter(args.category),
        categoryProvenance: args.categoryProvenance ?? "ANY",
        tag: toFilter(args.tag),
        conceptId,
        exactConcept: args.exactConcept ?? false,
        page: toPage(args.page),
      }),
      conceptId ? getConceptRefs([conceptId]) : [],
    ]);
    return { ...page, concept: concepts[0] ?? null };
  },

  recipe: (_parent, { id }, context) => {
    requireViewer(context);
    return getRecipeDetail(id);
  },

  recipeTaxonomy: (_parent, _args, context) => {
    requireViewer(context);
    return getRecipeTaxonomyOptions();
  },
};

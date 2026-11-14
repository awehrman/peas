import { toFailurePayload } from "./payload";
import { requireCurator } from "./teach";
import { toPage } from "./validation";

import {
  type StructureDecision,
  type StructureProposalRecord,
  decideStructurePattern,
  decideStructureProposal,
  getStructureCounts,
  getStructurePatterns,
  getStructureProposal,
  listStructureProposals,
  undoStructureDecision,
} from "@peas/database";
import { z } from "zod";

import { type InvalidationDomain, createMutationEffect } from "../effects";
import type {
  MutationResolvers,
  QueryResolvers,
  StructureDecisionInput,
  StructureProposal,
} from "../generated/resolvers-types";

const PAGE_SIZE = 25;
const uuidSchema = z.uuid();

/** A structure decision changes the note's lines, its mentions, what counts toward usage and categories, and the review lists. */
const STRUCTURE_DOMAINS: InvalidationDomain[] = [
  "STRUCTURE_REVIEW",
  "NOTE_DETAIL",
  "RECIPE_DETAIL",
  "MENTIONS",
  "CONCEPT_DETAIL",
  "CATEGORIES",
  "DASHBOARD_STATS",
  "CORPUS_HEALTH",
];

function toProposal(record: StructureProposalRecord): StructureProposal {
  return {
    ...record,
    proposalType: record.proposal.type,
    parts: record.proposal.type === "SPLIT" ? record.proposal.parts : [],
  };
}

const decisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPROVE") }),
  z.object({ action: z.literal("REJECT") }),
  z.object({
    action: z.literal("CHANGE"),
    label: z.enum([
      "INGREDIENT",
      "INSTRUCTION",
      "SECTION_HEADING",
      "NOTE",
      "OTHER",
    ]),
  }),
]);

function toDecision(input: StructureDecisionInput): StructureDecision {
  return decisionSchema.parse({
    action: input.action,
    ...(input.label ? { label: input.label } : {}),
  });
}

function noteEffect(noteId: string) {
  return createMutationEffect({
    changed: [{ typename: "Note", id: noteId }],
    invalidatedDomains: STRUCTURE_DOMAINS,
  });
}

export const StructureQuery: Pick<
  QueryResolvers,
  | "structureProposals"
  | "structureProposal"
  | "structureCounts"
  | "structurePatterns"
> = {
  structureProposals: async (_parent, args, context) => {
    requireCurator(context);
    const page = toPage(args.page);
    const { items, total } = await listStructureProposals({
      status: args.status ?? "OPEN",
      patternKey: args.patternKey ?? undefined,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    });
    return { items: items.map(toProposal), total, page, pageSize: PAGE_SIZE };
  },

  structureProposal: async (_parent, { id }, context) => {
    requireCurator(context);
    if (!uuidSchema.safeParse(id).success) return null;
    const record = await getStructureProposal(id);
    return record ? toProposal(record) : null;
  },

  structureCounts: async (_parent, _args, context) => {
    requireCurator(context);
    return getStructureCounts();
  },

  structurePatterns: async (_parent, _args, context) => {
    requireCurator(context);
    return (await getStructurePatterns()).map(({ topSource, ...pattern }) => ({
      ...pattern,
      topSourceLabel: topSource?.label ?? null,
      topSourceShare: topSource?.share ?? null,
    }));
  },
};

export const StructureMutation: Pick<
  MutationResolvers,
  "decideStructureProposal" | "undoStructureDecision" | "decideStructurePattern"
> = {
  decideStructureProposal: async (_parent, { id, input }, context) => {
    const viewer = requireCurator(context);
    try {
      const record = await decideStructureProposal(
        uuidSchema.parse(id),
        toDecision(input),
        viewer.id
      );
      return {
        __typename: "StructureDecisionPayload",
        success: true,
        message: null,
        proposal: toProposal(record),
        effect: noteEffect(record.noteId),
      };
    } catch (error) {
      return {
        __typename: "StructureDecisionPayload",
        ...toFailurePayload(error),
        proposal: null,
      };
    }
  },

  undoStructureDecision: async (_parent, { id }, context) => {
    requireCurator(context);
    try {
      const record = await undoStructureDecision(uuidSchema.parse(id));
      return {
        __typename: "StructureDecisionPayload",
        success: true,
        message: null,
        proposal: toProposal(record),
        effect: noteEffect(record.noteId),
      };
    } catch (error) {
      return {
        __typename: "StructureDecisionPayload",
        ...toFailurePayload(error),
        proposal: null,
      };
    }
  },

  decideStructurePattern: async (_parent, { patternKey, input }, context) => {
    const viewer = requireCurator(context);
    try {
      const result = await decideStructurePattern(
        patternKey,
        toDecision(input),
        viewer.id
      );
      return {
        __typename: "StructurePatternPayload",
        success: true,
        message: `Applied to ${result.applied} ${result.applied === 1 ? "line" : "lines"}${result.skipped ? `; ${result.skipped} skipped because the line changed` : ""}`,
        applied: result.applied,
        skipped: result.skipped,
        effect: createMutationEffect({
          invalidatedDomains: [...STRUCTURE_DOMAINS, "NOTES"],
        }),
      };
    } catch (error) {
      return {
        __typename: "StructurePatternPayload",
        ...toFailurePayload(error),
        applied: null,
        skipped: null,
      };
    }
  },
};

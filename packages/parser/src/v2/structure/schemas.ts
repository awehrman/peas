import { BLOCK_KINDS, SCORED_BLOCK_KINDS, SIGNAL_IDS } from "./types.js";

import { z } from "zod";

/**
 * @example
 * { id: "COLON_HEADING", kind: "SECTION_HEADING", weight: 4, text: "For the sauce:" }
 */
export const BlockSignalSchema = z.object({
  id: z.enum(SIGNAL_IDS),
  kind: z.enum(SCORED_BLOCK_KINDS),
  weight: z.number(),
  text: z.string().optional(),
});

export const SplitPartSchema = z.object({
  kind: z.enum(BLOCK_KINDS),
  text: z.string(),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
});

/**
 * What the validator proposes for a block, as stored on StructureProposal.proposal.
 *
 * @example
 * { type: "RECLASSIFY", kind: "SECTION_HEADING" }
 * { type: "SPLIT", parts: [{ kind: "SECTION_HEADING", text: "For the sauce:", start: 0, end: 14 }, { kind: "INSTRUCTION", text: "Combine…", start: 15, end: 40 }] }
 */
export const StructureProposalSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RECLASSIFY"), kind: z.enum(BLOCK_KINDS) }),
  z.object({
    type: z.literal("SPLIT"),
    parts: z.array(SplitPartSchema).length(2),
  }),
]);

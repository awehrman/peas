import { z } from "zod";

import { LEXICON_ROLES } from "../ast/types.js";

import { LEXICON_ENTRY_STATUSES } from "./types.js";

/**
 * One lexicon entry. Ids are UUIDs (generate with `crypto.randomUUID()`); readable keys belong in `text`.
 *
 * @example
 * { id: "3f0c9e52-6a1d-4c3e-9b7a-2d8e5f41c0a7", text: "extra-virgin olive oil", role: "FOOD" }
 * { id: "9b1d2c84-07e3-4f6a-a5c9-61e0d7b3f218", text: "virgin olive oil", role: "FOOD", status: "PROPOSED" }
 */
export const LexiconEntryInputSchema = z.looseObject({
  id: z.uuid(),
  text: z.string().trim().min(1),
  role: z.enum(LEXICON_ROLES),
  status: z.enum(LEXICON_ENTRY_STATUSES).optional(),
});

/**
 * A versioned set of entries with unique ids.
 *
 * @example
 * { revision: 1, entries: [{ id: "c2a7e0d4-5b8f-4e19-8c3a-7f6d1e9b2a05", text: "garlic", role: "FOOD" }] }
 */
export const LexiconSnapshotSchema = z
  .object({
    revision: z.number().int().nonnegative().nullable(),
    entries: z.array(LexiconEntryInputSchema),
  })
  .superRefine(({ entries }, ctx) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate lexicon entry id ${entry.id}`,
          path: ["entries", index, "id"],
        });
      }
      seen.add(entry.id);
    });
  });

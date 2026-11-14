import {
  type ResolverContext,
  type ResolverSnapshot,
  buildResolverContext,
} from "@peas/parser/v2";

export const BUTTER_ID = "00000000-0000-4000-8000-000000000001";
export const FLOUR_ID = "00000000-0000-4000-8000-000000000002";

/** A tiny lexicon for queue tests: butter and flour, at revision 7. */
export const fixtureSnapshot: ResolverSnapshot = {
  revision: 7,
  entries: [
    { id: "00000000-0000-4000-8000-0000000000e1", text: "butter", role: "FOOD", conceptId: BUTTER_ID, status: "ACTIVE" },
    { id: "00000000-0000-4000-8000-0000000000e2", text: "flour", role: "FOOD", conceptId: FLOUR_ID, status: "ACTIVE" },
  ],
  vocabulary: { definitions: [], preparations: [] },
  concepts: [
    { id: BUTTER_ID, canonicalName: "butter", status: "VERIFIED" },
    { id: FLOUR_ID, canonicalName: "flour", status: "VERIFIED" },
  ],
  relationships: [],
  applicability: [],
  conceptAttributes: [],
};

export function fixtureContext(snapshot: ResolverSnapshot = fixtureSnapshot): ResolverContext {
  return buildResolverContext(snapshot);
}

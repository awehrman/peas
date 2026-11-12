import fragmentMatcher from "~/graphql/possible-types";

import type { InMemoryCacheConfig } from "@apollo/client";

/** Entities with immutable database ids; every one is cached once as `<Typename>:<id>` and shared by every view. */
const ID_KEYED_TYPES = [
  "Viewer",
  "Note",
  "NoteSummary",
  "IngredientLine",
  "InstructionLine",
  "NoteImage",
  "Source",
  "SourceUrl",
  "NamedTag",
  "Recipe",
  "RecipeSummary",
  "Ingredient",
  "IngredientSummary",
  "IngredientOption",
  "IngredientAlias",
  "IngredientReference",
] as const;

/** Value objects that must never be normalized. EntityRef's `id` belongs to another type, so normalizing it would merge unrelated entities. */
const EMBEDDED_TYPES = [
  "EntityRef",
  "MutationEffect",
  "DeletedCount",
  "ParsedSegment",
  "IngredientBlock",
] as const;

interface RedirectOptions {
  args: Record<string, unknown> | null;
  toReference: (ref: { __typename: string; id: string }) => unknown;
}

function redirectToEntity(typename: string) {
  return {
    read(existing: unknown, { args, toReference }: RedirectOptions) {
      if (existing !== undefined) return existing;
      const id = args?.id;
      return typeof id === "string"
        ? toReference({ __typename: typename, id })
        : undefined;
    },
  };
}

/**
 * Cache configuration (decision M5: identity is `__typename:id`, never names or slugs). `note(id)`, `recipe(id)`, and `ingredient(id)` read straight from the entity cache when it already holds the entity. `possibleTypes` comes from codegen so interface fragments (`PayloadFields on MutationPayload`) match.
 */
export const cacheConfig: InMemoryCacheConfig = {
  possibleTypes: fragmentMatcher.possibleTypes,
  typePolicies: {
    ...Object.fromEntries(
      ID_KEYED_TYPES.map((typename) => [typename, { keyFields: ["id"] }])
    ),
    ...Object.fromEntries(
      EMBEDDED_TYPES.map((typename) => [
        typename,
        { keyFields: false as const },
      ])
    ),
    Job: { keyFields: ["jobId"] },
    Query: {
      fields: {
        note: redirectToEntity("Note"),
        recipe: redirectToEntity("Recipe"),
        ingredient: redirectToEntity("Ingredient"),
      },
    },
  },
};

import { buildSchema, isEnumType } from "graphql";
import { describe, expect, it } from "vitest";

import {
  INVALIDATION_DOMAINS,
  MAX_EFFECT_REFS,
  createMutationEffect,
  mutationEffectSchema,
} from "../effects.js";
import typeDefs from "../schema/schema.graphql?raw";

describe("mutation effects", () => {
  it("lists the same domains as the GraphQL InvalidationDomain enum", () => {
    const type = buildSchema(typeDefs).getType("InvalidationDomain");
    expect(isEnumType(type)).toBe(true);
    if (!isEnumType(type)) return;
    expect(type.getValues().map((value) => value.name)).toEqual([
      ...INVALIDATION_DOMAINS,
    ]);
  });

  it("drops duplicate refs and orders domains canonically", () => {
    const effect = createMutationEffect({
      changed: [
        { typename: "Recipe", id: "r1" },
        { typename: "Recipe", id: "r1" },
      ],
      invalidatedDomains: ["RECIPE_TAXONOMY", "RECIPES", "RECIPES"],
    });
    expect(effect).toEqual({
      changed: [{ typename: "Recipe", id: "r1" }],
      evicted: [],
      invalidatedDomains: ["RECIPES", "RECIPE_TAXONOMY"],
      lexiconRevision: null,
      reprocessingJobId: null,
    });
  });

  it("caps ref lists and falls back to overflow domains", () => {
    const changed = Array.from({ length: MAX_EFFECT_REFS + 5 }, (_, index) => ({
      typename: "IngredientLine",
      id: `l${index}`,
    }));
    const effect = createMutationEffect({ changed }, ["NOTE_DETAIL"]);
    expect(effect.changed).toHaveLength(MAX_EFFECT_REFS);
    expect(effect.invalidatedDomains).toEqual(["NOTE_DETAIL"]);
    expect(mutationEffectSchema.safeParse(effect).success).toBe(true);
  });
});

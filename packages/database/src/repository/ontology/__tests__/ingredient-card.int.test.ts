import {
  createNote,
  createUser,
  hasTestDatabase,
  resetDatabase,
} from "./int-helpers.js";

import { buildResolverContext, processIngredientLine } from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../client.js";
import {
  type ModifierSeedEntry,
  seedLexiconModifiers,
} from "../../../seed/lexicon-modifiers.js";
import { seedOntologyVocabulary } from "../../../seed/ontology-vocabulary.js";
import {
  type StarterFoodsSeed,
  seedStarterFoods,
} from "../../../seed/starter-foods.js";
import { applyDecision } from "../apply-decision.js";
import { saveImportedLine } from "../backfill.js";
import { OntologyError } from "../helpers.js";
import {
  type IngredientCardSaveInput,
  createIngredientConcept,
  dietaryTagsFor,
  findIngredientNameOwner,
  getIngredientCard,
  getIngredientCategoryOptions,
  listIngredientSummaries,
  nextUnreviewedIngredientId,
  planIngredientEdit,
  saveIngredientCard,
  searchIngredientOptions,
} from "../ingredient-card.js";
import { loadResolverSnapshot } from "../resolver-context.js";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          `../../../../../parser/fixtures/lexicon/${name}`,
          import.meta.url
        )
      ),
      "utf8"
    )
  ) as T;
}

async function conceptId(name: string): Promise<string> {
  return (
    await prisma.foodConcept.findFirstOrThrow({
      where: { canonicalName: name },
      select: { id: true },
    })
  ).id;
}

async function cardInput(name: string): Promise<IngredientCardSaveInput> {
  const card = await getIngredientCard(await conceptId(name));
  if (!card) throw new Error(`no card for ${name}`);
  return {
    id: card.id,
    name: card.name,
    plural: card.plural,
    aliases: card.aliases.map((alias) => alias.name),
    relationships: card.relationships.map((relation) => ({
      ingredientId: relation.ingredient.id,
      relationshipType: relation.relationshipType,
    })),
    properties: card.propertyStates.flatMap((state) =>
      state.explicit === "TRUE" ? [state.property] : []
    ),
    excludedProperties: card.propertyStates.flatMap((state) =>
      state.explicit === "FALSE" ? [state.property] : []
    ),
    categories: card.categories,
    tags: card.tags,
    substitutionIds: card.substitutions.map((option) => option.id),
    isComposedIngredient: card.isComposedIngredient,
    markReviewed: true,
    advanceToNext: false,
  };
}

describe.skipIf(!hasTestDatabase)("ingredient cards (integration)", () => {
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedOntologyVocabulary();
    await seedLexiconModifiers(
      fixture<{ entries: ModifierSeedEntry[] }>("modifiers.seed.json").entries
    );
    await seedStarterFoods({
      ...fixture<StarterFoodsSeed>("starter-foods.seed.json"),
      status: "VERIFIED",
    });
    userId = await createUser();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("lists every approved food, variants included, and every proposed food under needs review", async () => {
    const approved = await listIngredientSummaries("all");
    expect(approved).toHaveLength(31);
    expect(
      approved.find((summary) => summary.name === "canned tomatoes")
    ).toMatchObject({
      parentIngredientId: await conceptId("tomato"),
    });
    expect(
      approved.find((summary) => summary.name === "tomato")?.parentIngredientId
    ).toBeNull();
    expect(
      (await listIngredientSummaries("unreviewed")).map((summary) => [
        summary.name,
        summary.parentIngredientId,
      ])
    ).toEqual([
      ["chicken drumstick", await conceptId("chicken")],
      ["lemon zest", await conceptId("lemon")],
    ]);
  });

  it("shows a food's names, relationships, variants by relationship, and references", async () => {
    const ctx = buildResolverContext(await loadResolverSnapshot());
    const noteId = await createNote("Stew");
    await saveImportedLine(
      {
        noteId,
        blockIndex: 0,
        lineIndex: 0,
        reference: "1 lb chicken thighs",
        parseStatus: "COMPLETED_SUCCESSFULLY",
        isActive: true,
        parserVersion: "v2:test",
        result: processIngredientLine("1 lb chicken thighs", ctx),
      },
      ctx
    );

    expect(
      await getIngredientCard(await conceptId("chicken thigh"))
    ).toMatchObject({
      name: "chicken thigh",
      plural: "chicken thighs",
      aliases: [],
      isReviewed: true,
      relationships: [
        { relationshipType: "PART_OF", ingredient: { name: "chicken" } },
      ],
      referenceCount: 1,
      references: [{ reference: "1 lb chicken thighs", noteTitle: "Stew" }],
    });
    const chicken = await getIngredientCard(await conceptId("chicken"));
    expect(
      chicken?.variants.map((variant) => [
        variant.ingredient.name,
        variant.relationshipType,
      ])
    ).toEqual([
      ["chicken breast", "PART_OF"],
      ["chicken drumstick", "PART_OF"],
      ["chicken thigh", "PART_OF"],
      ["chicken wing", "PART_OF"],
      ["ground chicken", "PROCESSED_FROM"],
    ]);
    expect(
      (
        await getIngredientCard(await conceptId("olive oil"))
      )?.relationships.map((relation) => [
        relation.relationshipType,
        relation.ingredient.name,
      ])
    ).toEqual([
      ["DERIVED_FROM", "olive"],
      ["IS_A", "oil"],
    ]);
    const drumstick = await getIngredientCard(
      await conceptId("chicken drumstick")
    );
    expect(drumstick).toMatchObject({
      isReviewed: false,
      plural: "chicken drumsticks",
      aliases: [{ name: "drumsticks" }],
    });
    expect(
      await planIngredientEdit(await cardInput("chicken drumstick"))
    ).toBeNull();
    expect(
      (await searchIngredientOptions("chick", await conceptId("chicken")))
        .length
    ).toBe(5);
    expect(
      await getIngredientCard("00000000-0000-7000-8000-000000000000")
    ).toBeNull();
  });

  it("saves lexicon changes as one EDIT_CONCEPT decision that reverts cleanly", async () => {
    const input = await cardInput("powdered sugar");
    expect(await planIngredientEdit(input)).toBeNull();

    const sugar = await conceptId("sugar");
    const { decisions } = await saveIngredientCard(
      {
        ...input,
        name: "icing sugar",
        plural: null,
        aliases: ["powdered sugar", "confectioners sugar"],
        relationships: [{ ingredientId: sugar, relationshipType: "IS_A" }],
      },
      userId
    );
    expect(decisions.map((decision) => decision.payload.type)).toEqual([
      "EDIT_CONCEPT",
    ]);

    const edited = await getIngredientCard(input.id);
    expect(edited).toMatchObject({
      name: "icing sugar",
      relationships: [
        { relationshipType: "IS_A", ingredient: { name: "sugar" } },
      ],
    });
    expect(edited?.aliases.map((alias) => alias.name).sort()).toEqual([
      "confectioners sugar",
      "powdered sugar",
    ]);
    expect(
      await prisma.lexiconEntry.count({
        where: {
          conceptId: input.id,
          text: "confectioners' sugar",
          status: "DEPRECATED",
        },
      })
    ).toBe(1);
    const ctx = buildResolverContext(await loadResolverSnapshot());
    expect(
      processIngredientLine("2 tbsp icing sugar", ctx).mentions[0]?.resolution
        .candidates[0]?.conceptId
    ).toBe(input.id);

    await applyDecision({
      payload: { type: "REVERT", decisionId: decisions[0]?.decisionId ?? "" },
      userId,
    });
    const reverted = await getIngredientCard(input.id);
    expect(reverted).toMatchObject({ name: "powdered sugar" });
    expect(reverted?.aliases.map((alias) => alias.name).sort()).toEqual([
      "confectioners sugar",
      "confectioners' sugar",
    ]);
    expect(
      await prisma.lexiconEntry.findFirst({
        where: { conceptId: input.id, text: "powdered sugar" },
        select: { kind: true, status: true },
      })
    ).toEqual({ kind: "CANONICAL", status: "ACTIVE" });
  });

  it("replaces a food's relationships with exactly the ones the card sends", async () => {
    const input = await cardInput("olive oil");
    const olive = await conceptId("olive");
    const vegetableOil = await conceptId("vegetable oil");
    const { decisions } = await saveIngredientCard(
      {
        ...input,
        relationships: [
          { ingredientId: olive, relationshipType: "PROCESSED_FROM" },
          { ingredientId: vegetableOil, relationshipType: "IS_A" },
          { ingredientId: input.id, relationshipType: "IS_A" },
        ],
      },
      userId
    );
    expect(decisions.map((decision) => decision.payload)).toEqual([
      expect.objectContaining({
        type: "EDIT_CONCEPT",
        addRelationships: [
          { targetConceptId: olive, relationshipType: "PROCESSED_FROM" },
          { targetConceptId: vegetableOil, relationshipType: "IS_A" },
        ],
        retireRelationships: [
          { targetConceptId: olive, relationshipType: "DERIVED_FROM" },
          { targetConceptId: await conceptId("oil"), relationshipType: "IS_A" },
        ],
      }),
    ]);
    expect(
      (await getIngredientCard(input.id))?.relationships.map(
        (relation) => relation.ingredient.name
      )
    ).toEqual(["olive", "vegetable oil"]);

    await saveIngredientCard(
      { ...(await cardInput("olive oil")), relationships: [] },
      userId
    );
    expect((await getIngredientCard(input.id))?.relationships).toEqual([]);
    expect(
      (await listIngredientSummaries("all")).find(
        (summary) => summary.name === "olive oil"
      )?.parentIngredientId
    ).toBeNull();
  });

  it('shows inherited properties with their source, and saves a "does not contain" override', async () => {
    await saveIngredientCard(
      { ...(await cardInput("wheat")), properties: ["GRAIN", "GLUTEN"] },
      userId
    );
    await saveIngredientCard(
      { ...(await cardInput("chicken")), properties: ["MEAT"] },
      userId
    );

    const flour = await getIngredientCard(await conceptId("flour"));
    expect(flour?.propertyStates).toEqual([
      {
        property: "GRAIN",
        explicit: null,
        inherited: "TRUE",
        inheritedFrom: { id: await conceptId("wheat"), name: "wheat" },
      },
      {
        property: "GLUTEN",
        explicit: null,
        inherited: "TRUE",
        inheritedFrom: { id: await conceptId("wheat"), name: "wheat" },
      },
    ]);
    expect(flour?.dietaryTags).toEqual(["VEGAN", "VEGETARIAN"]);
    expect(
      (await getIngredientCard(await conceptId("wheat")))?.dietaryTags
    ).toEqual(["VEGAN", "VEGETARIAN"]);

    const thigh = await getIngredientCard(await conceptId("chicken thigh"));
    expect(thigh?.propertyStates).toMatchObject([
      {
        property: "MEAT",
        explicit: null,
        inherited: "TRUE",
        inheritedFrom: { name: "chicken" },
      },
    ]);
    expect(
      (await listIngredientSummaries("all")).find(
        (summary) => summary.name === "chicken thigh"
      )?.properties
    ).toEqual(["GLUTEN_FREE", "MEAT"]);

    await saveIngredientCard(
      { ...(await cardInput("flour")), excludedProperties: ["GLUTEN"] },
      userId
    );
    expect(
      (await getIngredientCard(await conceptId("flour")))?.propertyStates
    ).toMatchObject([
      { property: "GRAIN", explicit: null, inherited: "TRUE" },
      {
        property: "GLUTEN",
        explicit: "FALSE",
        inherited: "TRUE",
        inheritedFrom: { name: "wheat" },
      },
    ]);
    expect(
      (await getIngredientCard(await conceptId("all-purpose flour")))
        ?.propertyStates
    ).toMatchObject([
      { property: "GRAIN", explicit: null, inherited: "TRUE" },
      {
        property: "GLUTEN",
        explicit: null,
        inherited: "FALSE",
        inheritedFrom: { name: "flour" },
      },
    ]);

    await saveIngredientCard(
      { ...(await cardInput("flour")), excludedProperties: [] },
      userId
    );
    expect(
      (await getIngredientCard(await conceptId("flour")))?.propertyStates
    ).toMatchObject([
      { property: "GRAIN", explicit: null, inherited: "TRUE" },
      { property: "GLUTEN", explicit: null, inherited: "TRUE" },
    ]);
  });

  it("computes vegan, vegetarian, and gluten-free tags from properties, including inherited ones", async () => {
    expect(dietaryTagsFor(new Set())).toEqual([]);
    expect(dietaryTagsFor(new Set(["VEGETABLE"]))).toEqual([
      "VEGAN",
      "VEGETARIAN",
      "GLUTEN_FREE",
    ]);
    expect(dietaryTagsFor(new Set(["DAIRY", "GRAIN"]))).toEqual([
      "VEGETARIAN",
      "GLUTEN_FREE",
    ]);
    expect(dietaryTagsFor(new Set(["GRAIN", "GLUTEN"]))).toEqual([
      "VEGAN",
      "VEGETARIAN",
    ]);
    expect(dietaryTagsFor(new Set(["FISH"]))).toEqual(["GLUTEN_FREE"]);

    await saveIngredientCard(
      { ...(await cardInput("garlic")), properties: ["VEGETABLE"] },
      userId
    );
    await saveIngredientCard(
      { ...(await cardInput("milk")), properties: ["DAIRY"] },
      userId
    );
    expect(
      (await getIngredientCard(await conceptId("garlic clove")))?.dietaryTags
    ).toEqual(["VEGAN", "VEGETARIAN", "GLUTEN_FREE"]);
    expect(
      (await getIngredientCard(await conceptId("whole milk")))?.dietaryTags
    ).toEqual(["VEGETARIAN", "GLUTEN_FREE"]);
    const summaries = await listIngredientSummaries("all");
    expect(
      summaries.find((summary) => summary.name === "garlic")?.properties
    ).toEqual(["VEGAN", "VEGETARIAN", "GLUTEN_FREE", "VEGETABLE"]);
    expect(
      summaries.find((summary) => summary.name === "salt")?.properties
    ).toEqual(["VEGAN", "VEGETARIAN", "GLUTEN_FREE", "SEASONING"]);
  });

  it("refuses an alternate name another food already answers to", async () => {
    const thigh = await conceptId("chicken thigh");
    expect(
      await findIngredientNameOwner(
        "Chicken Thighs",
        await conceptId("chicken breast")
      )
    ).toEqual({
      id: thigh,
      name: "chicken thigh",
    });
    expect(await findIngredientNameOwner("chicken thighs", thigh)).toBeNull();
    expect(await findIngredientNameOwner("EVOO")).toMatchObject({
      name: "extra-virgin olive oil",
    });
    expect(await findIngredientNameOwner("dragon fruit")).toBeNull();
    expect(await findIngredientNameOwner("  ")).toBeNull();

    const breast = await cardInput("chicken breast");
    await expect(
      saveIngredientCard({ ...breast, aliases: ["chicken thighs"] }, userId)
    ).rejects.toThrow("“chicken thighs” is already a name of chicken thigh");
    await expect(
      saveIngredientCard({ ...breast, aliases: ["boneless breast"] }, userId)
    ).resolves.toMatchObject({ decisions: [expect.objectContaining({})] });
  });

  it("writes properties, categories, tags, substitutes, and the composed flag directly", async () => {
    const input = await cardInput("butter");
    const oil = await conceptId("vegetable oil");
    const { decisions } = await saveIngredientCard(
      {
        ...input,
        properties: ["DAIRY", "GLUTEN"],
        categories: ["Dairy case", "Spreads"],
        tags: ["fridge"],
        substitutionIds: [oil],
        isComposedIngredient: true,
      },
      userId
    );
    expect(decisions).toEqual([]);
    expect(await getIngredientCard(input.id)).toMatchObject({
      propertyStates: [
        {
          property: "DAIRY",
          explicit: "TRUE",
          inherited: "TRUE",
          inheritedFrom: { name: "milk" },
        },
        {
          property: "GLUTEN",
          explicit: "TRUE",
          inherited: null,
          inheritedFrom: null,
        },
      ],
      dietaryTags: ["VEGETARIAN"],
      categories: ["Dairy case", "Spreads"],
      tags: ["fridge"],
      substitutions: [{ name: "vegetable oil" }],
      isComposedIngredient: true,
    });
    expect(await getIngredientCategoryOptions()).toEqual([
      "Dairy case",
      "Spreads",
    ]);

    await saveIngredientCard(
      {
        ...input,
        properties: ["DAIRY"],
        categories: ["Spreads"],
        tags: [],
        substitutionIds: [],
      },
      userId
    );
    expect(await getIngredientCard(input.id)).toMatchObject({
      propertyStates: [{ property: "DAIRY", explicit: "TRUE" }],
      categories: ["Spreads"],
      tags: [],
      substitutions: [],
    });
    expect(await getIngredientCategoryOptions()).toEqual(["Spreads"]);
  });

  it("approves a proposed food on save, moves to the next one, and adds new foods", async () => {
    const drumstick = await cardInput("chicken drumstick");
    const { decisions, nextId } = await saveIngredientCard(
      { ...drumstick, advanceToNext: true },
      userId
    );
    expect(decisions.map((decision) => decision.payload.type)).toEqual([
      "APPROVE_CONCEPT",
    ]);
    expect((await getIngredientCard(drumstick.id))?.isReviewed).toBe(true);
    expect(nextId).toBe(await conceptId("lemon zest"));
    expect(
      await nextUnreviewedIngredientId(
        "lemon zest",
        await conceptId("lemon zest")
      )
    ).toBeNull();

    const { id } = await createIngredientConcept(
      { name: "shallot", plural: "shallots" },
      userId
    );
    expect(await getIngredientCard(id)).toMatchObject({
      name: "shallot",
      plural: "shallots",
      isReviewed: true,
    });
    expect((await getIngredientCard(id))?.reviewedAt).not.toBeNull();
    await expect(
      createIngredientConcept({ name: "Shallot", plural: null }, userId)
    ).rejects.toThrow(OntologyError);
  });
});

import { buildResolverContext, processIngredientLine } from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import { type ModifierSeedEntry, seedLexiconModifiers } from "../../seed/lexicon-modifiers.js";
import { seedOntologyVocabulary } from "../../seed/ontology-vocabulary.js";
import { type StarterFoodsSeed, seedStarterFoods } from "../../seed/starter-foods.js";
import {
  addCategoryToNote,
  approveCategory,
  createCategory,
  excludeCategory,
  getNoteCategoryMemberships,
  previewCategoryRule,
  recomputeAllConceptCategories,
  recomputeCategory,
  recomputeNoteCategories,
  removeCategory,
  restoreCategory,
  setNoteManualCategories,
  updateCategoryRule,
} from "../categories.js";
import { saveImportedLine } from "../ontology/backfill.js";
import { createNote, hasTestDatabase, resetDatabase } from "../ontology/__tests__/int-helpers.js";
import { addRelationship } from "../ontology/relationships.js";
import { loadResolverSnapshot } from "../ontology/resolver-context.js";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../../../parser/fixtures/lexicon/${name}`, import.meta.url)), "utf8")
  ) as T;
}

async function seedKnowledge() {
  await seedOntologyVocabulary();
  await seedLexiconModifiers(fixture<{ entries: ModifierSeedEntry[] }>("modifiers.seed.json").entries);
  await seedStarterFoods(fixture<StarterFoodsSeed>("starter-foods.seed.json"));
}

async function noteWithLines(title: string, lines: string[]): Promise<string> {
  const ctx = buildResolverContext(await loadResolverSnapshot());
  const noteId = await createNote(title);
  for (const [lineIndex, reference] of lines.entries()) {
    await saveImportedLine(
      {
        noteId,
        blockIndex: 0,
        lineIndex,
        reference,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        isActive: true,
        parserVersion: "v2:test",
        result: processIngredientLine(reference, ctx),
      },
      ctx
    );
  }
  return noteId;
}

async function conceptId(slug: string): Promise<string> {
  return (await prisma.foodConcept.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id;
}

async function stateOf(noteId: string, categoryId: string) {
  return (await prisma.noteCategory.findUnique({ where: { noteId_categoryId: { noteId, categoryId } } }))?.state ?? null;
}

describe.skipIf(!hasTestDatabase)("ingredient categories", () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedKnowledge();
  });

  beforeEach(async () => {
    // TRUNCATE ... CASCADE would also empty FoodConcept (it references Recipe, which references Note)
    await prisma.noteCategory.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.ingredientMention.deleteMany({});
    await prisma.discovery.deleteMany({});
    await prisma.parsedIngredientLine.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.foodRelationship.deleteMany({
      where: { type: "IS_A", source: { slug: "ground-chicken" }, target: { slug: "chicken" } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("infers Chicken from parts of a chicken, with the path as evidence, but not from things processed from it", async () => {
    const thighs = await noteWithLines("Braised thighs", ["1 lb chicken thighs"]);
    const ground = await noteWithLines("Meatballs", ["1 lb ground chicken"]);
    const chicken = await createCategory({ name: "Chicken", conceptId: await conceptId("chicken") });

    const summary = await recomputeCategory(chicken.id);
    expect(summary.added).toBe(1);
    expect(await stateOf(thighs, chicken.id)).toBe("INFERRED");
    expect(await stateOf(ground, chicken.id)).toBeNull();

    const [membership] = await getNoteCategoryMemberships(thighs);
    expect(membership).toMatchObject({ state: "INFERRED", origin: "CONCEPT_RULE", category: { name: "Chicken" } });
    expect(membership?.evidence[0]).toMatchObject({
      conceptName: "chicken thigh",
      path: [{ type: "PART_OF", conceptName: "chicken" }],
    });
  });

  it("includes made-from relationships only when the category opts in, across several hops", async () => {
    const cream = await noteWithLines("Panna cotta", ["1 cup heavy cream"]);
    const milk = await noteWithLines("Custard", ["2 cups whole milk"]);
    const dairy = await createCategory({ name: "Milk", conceptId: await conceptId("milk") });

    await recomputeCategory(dairy.id);
    expect(await stateOf(milk, dairy.id)).toBe("INFERRED");
    expect(await stateOf(cream, dairy.id)).toBeNull();

    expect((await previewCategoryRule(await conceptId("milk"), ["IS_A", "PART_OF", "DERIVED_FROM"])).noteCount).toBe(2);
    expect(await stateOf(cream, dairy.id)).toBeNull();

    const { ruleChanged } = await updateCategoryRule(dairy.id, {
      name: "Milk",
      traversal: ["IS_A", "PART_OF", "DERIVED_FROM"],
    });
    expect(ruleChanged).toBe(true);
    await recomputeCategory(dairy.id);
    const [membership] = await getNoteCategoryMemberships(cream);
    expect(membership?.evidence[0]?.path.map((step) => [step.type, step.conceptName])).toEqual([
      ["IS_A", "cream"],
      ["DERIVED_FROM", "milk"],
    ]);
  });

  it("keeps approvals and exclusions through reprocessing, and drops inferences that lost their evidence", async () => {
    const approved = await noteWithLines("A", ["1 lb chicken thighs"]);
    const excluded = await noteWithLines("B", ["1 chicken breast"]);
    const inferred = await noteWithLines("C", ["2 chicken wings"]);
    const chicken = await createCategory({ name: "Chicken", conceptId: await conceptId("chicken") });
    await recomputeAllConceptCategories();

    await approveCategory({ noteId: approved, categoryId: chicken.id, userId: null });
    await excludeCategory({ noteId: excluded, categoryId: chicken.id, userId: null });

    // The ingredient lines stop mentioning chicken: only the inference goes away
    await prisma.parsedIngredientLine.updateMany({ data: { isActive: false } });
    await recomputeAllConceptCategories();

    expect(await stateOf(approved, chicken.id)).toBe("APPROVED");
    expect(await stateOf(excluded, chicken.id)).toBe("EXCLUDED");
    expect(await stateOf(inferred, chicken.id)).toBeNull();
    expect((await getNoteCategoryMemberships(approved))[0]?.evidence).toEqual([]);

    await prisma.parsedIngredientLine.updateMany({ data: { isActive: true } });
    await recomputeNoteCategories(excluded);
    expect(await stateOf(excluded, chicken.id)).toBe("EXCLUDED");
  });

  it("updates inferred memberships when a relationship changes", async () => {
    const ground = await noteWithLines("Meatballs", ["1 lb ground chicken"]);
    const chicken = await createCategory({ name: "Chicken", conceptId: await conceptId("chicken") });
    await recomputeCategory(chicken.id);
    expect(await stateOf(ground, chicken.id)).toBeNull();

    const [groundChicken, chickenConcept] = await Promise.all([conceptId("ground-chicken"), conceptId("chicken")]);
    await prisma.$transaction((tx) =>
      addRelationship(tx, { sourceId: groundChicken, targetId: chickenConcept, type: "IS_A", status: "ACTIVE" })
    );
    await recomputeAllConceptCategories();
    expect(await stateOf(ground, chicken.id)).toBe("INFERRED");
  });

  it("restores an exclusion as an inference when the rule still matches, and removal of a manual category", async () => {
    const thighs = await noteWithLines("Thighs", ["1 lb chicken thighs"]);
    const chicken = await createCategory({ name: "Chicken", conceptId: await conceptId("chicken") });
    await recomputeCategory(chicken.id);

    await excludeCategory({ noteId: thighs, categoryId: chicken.id, userId: null });
    expect(await restoreCategory({ noteId: thighs, categoryId: chicken.id, userId: null })).toEqual({ state: "INFERRED" });

    // Removing a category the rule would add back is recorded as an exclusion
    expect(await removeCategory({ noteId: thighs, categoryId: chicken.id, userId: null })).toEqual({ state: "EXCLUDED" });

    const { categoryId } = await addCategoryToNote({ noteId: thighs, categoryName: "Weeknight dinners", userId: null });
    expect(await stateOf(thighs, categoryId)).toBe("APPROVED");
    expect(await removeCategory({ noteId: thighs, categoryId, userId: null })).toEqual({ state: null });
    expect(await stateOf(thighs, categoryId)).toBeNull();
  });

  it("treats the recipe dialog's category list as manual decisions", async () => {
    const thighs = await noteWithLines("Thighs", ["1 lb chicken thighs"]);
    const chicken = await createCategory({ name: "Chicken", conceptId: await conceptId("chicken") });
    await recomputeCategory(chicken.id);

    await prisma.$transaction((tx) => setNoteManualCategories(tx, thighs, ["Thanksgiving", "thanksgiving"], null));
    const names = (await getNoteCategoryMemberships(thighs)).map((row) => [row.category.name, row.state]);
    expect(names).toEqual([
      ["Chicken", "EXCLUDED"],
      ["Thanksgiving", "APPROVED"],
    ]);
    await expect(createCategory({ name: "THANKSGIVING" })).rejects.toThrow("already exists");
  });
});

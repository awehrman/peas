import {
  createNote,
  createUser,
  execute,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import { prisma } from "@peas/database";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { AuthUser } from "../../auth/session.js";
import { createApiServer } from "../../server.js";

const server = createApiServer({ development: false });

const SAVE_INGREDIENT = `
  mutation ($input: IngredientSaveInput!) {
    saveIngredient(input: $input) { success message nextId effect { changed { typename id } invalidatedDomains } }
  }
`;

function saveInput(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: "garlic",
    plural: null,
    properties: ["VEGAN", "VEGETABLE"],
    isComposedIngredient: false,
    parentIngredientId: null,
    substitutionIds: [],
    aliases: ["ajo"],
    category: "Alliums",
    tags: ["Pantry"],
    markReviewed: true,
    advanceToNext: true,
    ...overrides,
  };
}

describe.skipIf(!hasTestDatabase)(
  "GraphQL resolvers against the database (integration)",
  () => {
    let user: AuthUser;
    let admin: AuthUser;

    beforeEach(async () => {
      await resetDatabase();
      user = await createUser({ username: "cook" });
      admin = await createUser({ username: "boss", admin: true });
    });

    afterAll(async () => {
      await server.stop();
      await prisma.$disconnect();
    });

    describe("notes", () => {
      it("lists, filters, and searches notes", async () => {
        await createNote("Weeknight Chili", ["2 cups beans"]);
        await createNote("Lemon Bars", ["1 cup flour"], "FAILED");

        const all = await execute<{
          notes: { total: number; items: { title: string }[] };
        }>(
          server,
          user,
          "{ notes { total items { title ingredientLineCount } } }"
        );
        expect(all.data?.notes.total).toBe(2);

        const failed = await execute<{ notes: { items: { title: string }[] } }>(
          server,
          user,
          "{ notes(status: FAILED) { items { title } } }"
        );
        expect(failed.data?.notes.items.map((note) => note.title)).toEqual([
          "Lemon Bars",
        ]);

        const search = await execute<{ notes: { items: { title: string }[] } }>(
          server,
          user,
          `{ notes(query: "chili") { items { title } } }`
        );
        expect(search.data?.notes.items.map((note) => note.title)).toEqual([
          "Weeknight Chili",
        ]);
      });

      it("records a line review and returns the refreshed note", async () => {
        const { noteId, lineIds } = await createNote("Weeknight Chili", [
          "2 cups beans",
          "1 tbsp oil",
        ]);
        const result = await execute<{
          setLineReviewStatus: {
            success: boolean;
            note: {
              id: string;
              ingredientBlocks: {
                lines: { id: string; reviewStatus: string }[];
              }[];
            };
          };
        }>(
          server,
          user,
          `mutation ($lineId: ID!) { setLineReviewStatus(lineId: $lineId, status: INCORRECT) {
          success note { id ingredientBlocks { lines { id reviewStatus } } }
        } }`,
          { lineId: lineIds[1] }
        );

        expect(result.data?.setLineReviewStatus.success).toBe(true);
        expect(result.data?.setLineReviewStatus.note.id).toBe(noteId);
        const lines =
          result.data?.setLineReviewStatus.note.ingredientBlocks[0]?.lines ??
          [];
        expect(lines.map((line) => line.reviewStatus)).toEqual([
          "UNREVIEWED",
          "INCORRECT",
        ]);
      });

      it("returns null for a missing note and a readable failure for a missing line", async () => {
        expect(
          (await execute(server, user, `{ note(id: "missing") { id } }`)).data
        ).toEqual({ note: null });
        const missing = await execute(
          server,
          user,
          `mutation { setLineReviewStatus(lineId: "missing", status: CORRECT) { success message } }`
        );
        expect(missing.data).toEqual({
          setLineReviewStatus: {
            success: false,
            message: "That item no longer exists",
          },
        });
      });
    });

    describe("recipes", () => {
      it("promotes a note, edits the recipe, and exposes the taxonomy", async () => {
        const { noteId } = await createNote("Weeknight Chili", [
          "2 cups beans",
        ]);

        const promoted = await execute<{
          promoteNoteToRecipe: { success: boolean; recipeId: string };
        }>(
          server,
          user,
          `mutation ($noteId: ID!) { promoteNoteToRecipe(noteId: $noteId) { success recipeId } }`,
          { noteId }
        );
        const recipeId = promoted.data!.promoteNoteToRecipe.recipeId;
        const again = await execute<{
          promoteNoteToRecipe: { recipeId: string };
        }>(
          server,
          user,
          `mutation ($noteId: ID!) { promoteNoteToRecipe(noteId: $noteId) { recipeId } }`,
          { noteId }
        );
        expect(again.data?.promoteNoteToRecipe.recipeId).toBe(recipeId);

        const updated = await execute(
          server,
          user,
          `mutation ($input: RecipeUpdateInput!) { updateRecipe(input: $input) { success } }`,
          {
            input: {
              id: recipeId,
              title: "Best Chili",
              categories: ["Dinner"],
              tags: ["spicy", "freezer"],
            },
          }
        );
        expect(updated.data).toEqual({ updateRecipe: { success: true } });

        const detail = await execute<{
          recipe: {
            title: string;
            categories: { name: string }[];
            tags: { name: string }[];
            noteId: string;
          };
        }>(
          server,
          user,
          `query ($id: ID!) { recipe(id: $id) { title noteId categories { name } tags { name } } }`,
          { id: recipeId }
        );
        expect(detail.data?.recipe).toMatchObject({
          title: "Best Chili",
          noteId,
          categories: [{ name: "Dinner" }],
        });
        expect(detail.data?.recipe.tags.map((tag) => tag.name).sort()).toEqual([
          "freezer",
          "spicy",
        ]);

        const list = await execute<{
          recipes: { total: number; items: { title: string }[] };
          recipeTaxonomy: { categories: string[]; tags: string[] };
        }>(
          server,
          user,
          `{ recipes(category: "Dinner") { total items { title } } recipeTaxonomy { categories tags } }`
        );
        expect(list.data?.recipes).toMatchObject({
          total: 1,
          items: [{ title: "Best Chili" }],
        });
        expect(list.data?.recipeTaxonomy).toEqual({
          categories: ["Dinner"],
          tags: ["freezer", "spicy"],
        });

        const noMatch = await execute<{ recipes: { total: number } }>(
          server,
          user,
          `{ recipes(tag: "dessert") { total } }`
        );
        expect(noMatch.data?.recipes.total).toBe(0);
      });

      it("promotes completed notes in bulk for admins only", async () => {
        await createNote("Chili", ["2 cups beans"]);
        await createNote("Soup", ["1 onion"]);
        await createNote("Broken", ["?"], "FAILED");
        const query =
          "mutation { promoteCompletedNotes { success message created } }";

        expect((await execute(server, user, query)).data).toEqual({
          promoteCompletedNotes: {
            success: false,
            message: "Only admins can perform this action",
            created: null,
          },
        });
        expect((await execute(server, admin, query)).data).toEqual({
          promoteCompletedNotes: { success: true, message: null, created: 2 },
        });
      });
    });

    describe("ingredients", () => {
      it("creates, edits, reviews, and searches ingredients", async () => {
        const created = await execute<{
          createIngredient: { success: boolean; id: string };
        }>(
          server,
          user,
          `mutation { createIngredient(input: { name: "garlic", plural: "garlics" }) { success id } }`
        );
        const garlicId = created.data!.createIngredient.id;
        const shallot = await execute<{ createIngredient: { id: string } }>(
          server,
          user,
          `mutation { createIngredient(input: { name: "shallot", plural: null }) { id } }`
        );

        const duplicate = await execute(
          server,
          user,
          `mutation { createIngredient(input: { name: "Garlic" }) { success message } }`
        );
        expect(duplicate.data).toEqual({
          createIngredient: {
            success: false,
            message: 'An ingredient named "Garlic" already exists',
          },
        });

        const saved = await execute<{
          saveIngredient: { success: boolean; nextId: string | null };
        }>(server, user, SAVE_INGREDIENT, {
          input: saveInput(garlicId),
        });
        expect(saved.data?.saveIngredient).toMatchObject({
          success: true,
          nextId: shallot.data!.createIngredient.id,
        });

        const detail = await execute<{ ingredient: Record<string, unknown> }>(
          server,
          user,
          `query ($id: ID!) { ingredient(id: $id) { name isReviewed properties category tags aliases { name } } }`,
          { id: garlicId }
        );
        expect(detail.data?.ingredient).toEqual({
          name: "garlic",
          isReviewed: true,
          properties: expect.arrayContaining(["VEGAN", "VEGETABLE"]),
          category: "Alliums",
          tags: ["pantry"],
          aliases: [{ name: "ajo" }],
        });

        const lists = await execute<{
          ingredients: { name: string }[];
          ingredientCounts: { all: number; unreviewed: number };
          ingredientCategoryNames: string[];
        }>(
          server,
          user,
          `{ ingredients(view: unreviewed) { name } ingredientCounts { all unreviewed } ingredientCategoryNames }`
        );
        expect(lists.data).toEqual({
          ingredients: [{ name: "shallot" }],
          ingredientCounts: { all: 2, unreviewed: 1 },
          ingredientCategoryNames: ["Alliums"],
        });

        const search = await execute<{ searchIngredients: { name: string }[] }>(
          server,
          user,
          `{ searchIngredients(query: "ajo") { name } }`
        );
        expect(search.data?.searchIngredients).toEqual([{ name: "garlic" }]);
        const excluded = await execute<{
          searchIngredients: { name: string }[];
        }>(
          server,
          user,
          `query ($id: ID) { searchIngredients(query: "garl", excludeId: $id) { name } }`,
          { id: garlicId }
        );
        expect(excluded.data?.searchIngredients).toEqual([]);
      });

      it("rejects invalid edits with readable messages", async () => {
        const created = await execute<{ createIngredient: { id: string } }>(
          server,
          user,
          `mutation { createIngredient(input: { name: "leek" }) { id } }`
        );
        const id = created.data!.createIngredient.id;

        const ownParent = await execute(server, user, SAVE_INGREDIENT, {
          input: saveInput(id, { name: "leek", parentIngredientId: id }),
        });
        expect(ownParent.data).toMatchObject({
          saveIngredient: {
            success: false,
            message: "An ingredient cannot be its own parent",
          },
        });

        const samePlural = await execute(server, user, SAVE_INGREDIENT, {
          input: saveInput(id, { name: "leek", plural: "Leek" }),
        });
        expect(samePlural.data).toMatchObject({
          saveIngredient: {
            success: false,
            message: "plural: Plural must be different from the name",
          },
        });
      });
    });

    describe("import, jobs, and cleanup", () => {
      it("reports import stats and queue job state", async () => {
        const { noteId } = await createNote("Chili", [
          "2 cups beans",
          "1 tbsp oil",
        ]);
        await prisma.queueJob.create({
          data: {
            jobId: `${noteId}-ingredient-0-1`,
            type: "PROCESS_INGREDIENT_LINE",
            status: "FAILED",
            noteId,
            errorMessage: "Parser crashed",
          },
        });

        const result = await execute(
          server,
          user,
          `query ($jobId: ID!) { importStats { numberOfNotes numberOfParsingErrors } job(jobId: $jobId) { status errorMessage noteId } missing: job(jobId: "nope") { status } }`,
          { jobId: `${noteId}-ingredient-0-1` }
        );
        expect(result.data).toEqual({
          importStats: { numberOfNotes: 1, numberOfParsingErrors: 0 },
          job: { status: "FAILED", errorMessage: "Parser crashed", noteId },
          missing: null,
        });
      });

      it("lets only admins delete all data, keeping users", async () => {
        await createNote("Chili", ["2 cups beans"]);
        const query =
          "mutation { cleanupAllData { success message deletedCounts { key count } } }";

        expect((await execute(server, user, query)).data).toMatchObject({
          cleanupAllData: { success: false, deletedCounts: null },
        });

        const result = await execute<{
          cleanupAllData: {
            success: boolean;
            deletedCounts: { key: string; count: number }[];
          };
        }>(server, admin, query);
        expect(result.data?.cleanupAllData.success).toBe(true);
        expect(result.data?.cleanupAllData.deletedCounts).toContainEqual({
          key: "notes",
          count: 1,
        });
        expect(await prisma.note.count()).toBe(0);
        expect(await prisma.user.count()).toBe(2);
      });
    });
  }
);

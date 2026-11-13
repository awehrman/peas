import {
  createNote,
  createUser,
  execute,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import { createConcept, prisma } from "@peas/database";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "../../auth/session.js";
import { createApiServer } from "../../server.js";

const curation = vi.hoisted(() => ({ isOpen: true }));
vi.mock("../../context.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../context.js")>();
  return {
    ...actual,
    canCurateKnowledge: (
      viewer: Parameters<typeof actual.canCurateKnowledge>[0]
    ) => curation.isOpen || actual.isAdmin(viewer),
  };
});

const server = createApiServer({ development: false });

describe.skipIf(!hasTestDatabase)(
  "GraphQL resolvers against the database (integration)",
  () => {
    let user: AuthUser;
    let admin: AuthUser;

    beforeEach(async () => {
      await resetDatabase();
      curation.isOpen = true;
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

    describe("concepts", () => {
      it("lets everyone read concepts, and only curators edit classifications, tags, and substitutions", async () => {
        const butter = await createConcept(prisma, {
          canonicalName: "butter",
          status: "VERIFIED",
        });
        const ghee = await createConcept(prisma, {
          canonicalName: "ghee",
          status: "VERIFIED",
        });
        const CONCEPT = `query ($id: ID!) { concept(id: $id) { canonicalName tags classifications { key value isExplicit } substitutions { concept { canonicalName } ratio } decisions { id } } }`;

        curation.isOpen = false;
        const denied = await execute<{
          setConceptTags: { success: boolean; message: string };
        }>(
          server,
          user,
          `mutation ($id: ID!) { setConceptTags(conceptId: $id, tags: ["fridge"]) { success message } }`,
          { id: butter.id }
        );
        expect(denied.data?.setConceptTags).toEqual({
          success: false,
          message: "You can't edit concepts yet",
        });
        curation.isOpen = true;

        const edits = await execute<Record<string, { success: boolean }>>(
          server,
          admin,
          `mutation ($id: ID!, $ghee: ID!) {
            tags: setConceptTags(conceptId: $id, tags: ["fridge", "baking"]) { success }
            vegan: setConceptClassification(input: { conceptId: $id, kind: DIETARY, key: "VEGAN", value: FALSE }) { success }
            category: setConceptClassification(input: { conceptId: $id, kind: CATEGORY, key: "CATEGORY:Dairy", value: TRUE }) { success }
            swap: setConceptSubstitution(input: { conceptId: $id, substituteId: $ghee, ratio: "1:1" }) { success }
          }`,
          { id: butter.id, ghee: ghee.id }
        );
        expect(edits.errors).toBeUndefined();
        expect(
          Object.values(edits.data ?? {}).every((row) => row.success)
        ).toBe(true);

        const read = await execute<{
          concept: {
            tags: string[];
            classifications: { key: string; isExplicit: boolean }[];
            substitutions: {
              concept: { canonicalName: string };
              ratio: string;
            }[];
            decisions: unknown[];
          };
        }>(server, user, CONCEPT, { id: butter.id });
        expect(read.data?.concept).toMatchObject({
          canonicalName: "butter",
          tags: ["baking", "fridge"],
          substitutions: [{ concept: { canonicalName: "ghee" }, ratio: "1:1" }],
          decisions: [],
        });
        expect(read.data?.concept.classifications).toEqual(
          expect.arrayContaining([
            { key: "VEGAN", value: "FALSE", isExplicit: true },
            { key: "CATEGORY:Dairy", value: "TRUE", isExplicit: true },
          ])
        );

        const removed = await execute<Record<string, { success: boolean }>>(
          server,
          admin,
          `mutation ($id: ID!, $ghee: ID!) {
            vegan: removeConceptClassification(conceptId: $id, key: "VEGAN") { success }
            swap: removeConceptSubstitution(conceptId: $id, substituteId: $ghee) { success }
          }`,
          { id: butter.id, ghee: ghee.id }
        );
        expect(removed.data).toEqual({
          vegan: { success: true },
          swap: { success: true },
        });

        const search = await execute<{
          searchConcepts: { canonicalName: string }[];
        }>(server, user, `{ searchConcepts(query: "gh") { canonicalName } }`);
        expect(search.data?.searchConcepts).toEqual([
          { canonicalName: "ghee" },
        ]);
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

      it("keeps food knowledge and decided review cards, and drops cards left without lines", async () => {
        await prisma.discovery.deleteMany({});
        const { id: conceptId } = await createConcept(prisma, {
          canonicalName: "cleanup parsnip",
          status: "VERIFIED",
        });
        const card = (
          key: string,
          status: "OPEN" | "DEFERRED" | "RESOLVED"
        ) => ({
          type: "UNKNOWN_FOOD_PHRASE" as const,
          key,
          status,
          payload: { type: "UNKNOWN_FOOD_PHRASE", phrase: key, headToken: key },
          mentionCount: 3,
          firstSeenRevision: 1,
          lastSeenRevision: 1,
        });
        await prisma.discovery.createMany({
          data: [
            card("cleanup open", "OPEN"),
            card("cleanup deferred", "DEFERRED"),
            card("cleanup resolved", "RESOLVED"),
          ],
        });
        await prisma.reinterpretRun.create({
          data: {
            jobId: "reinterpret-99",
            kind: "REINTERPRET_BY_REVISION",
            revision: 99,
          },
        });

        const result = await execute<{
          cleanupAllData: { deletedCounts: { key: string; count: number }[] };
        }>(
          server,
          admin,
          "mutation { cleanupAllData { deletedCounts { key count } } }"
        );
        expect(result.data?.cleanupAllData.deletedCounts).toEqual(
          expect.arrayContaining([
            { key: "discoveries", count: 2 },
            { key: "reinterpretRuns", count: 1 },
          ])
        );
        expect(
          (await prisma.discovery.findMany({ select: { key: true } })).map(
            (row) => row.key
          )
        ).toEqual(["cleanup resolved"]);
        expect(
          await prisma.foodConcept.findUnique({ where: { id: conceptId } })
        ).not.toBeNull();
        expect(await prisma.reinterpretRun.count()).toBe(0);
        await prisma.discovery.deleteMany({});
      });
    });
  }
);

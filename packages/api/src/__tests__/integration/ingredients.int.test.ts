import {
  createUser,
  execute,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import { prisma, seedOntologyVocabulary } from "@peas/database";
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

const CREATE = `
  mutation ($input: IngredientCreateInput!) {
    createIngredient(input: $input) {
      success message id
      effect { invalidatedDomains lexiconRevision }
    }
  }
`;

const SAVE = `
  mutation ($input: IngredientSaveInput!) {
    saveIngredient(input: $input) {
      success message nextId
      effect { changed { typename id } invalidatedDomains lexiconRevision }
    }
  }
`;

const DETAIL = `
  query ($id: ID!) {
    ingredient(id: $id) {
      id name plural isReviewed categories isComposedIngredient dietaryTags
      propertyStates { property explicit inherited inheritedFrom { name } }
      aliases { name }
      relationships { relationshipType ingredient { id name } }
    }
  }
`;

const LEXICON = `
  query ($query: String, $role: String) {
    lexicon(query: $query, role: $role) {
      items { text role kind status targetLabel conceptId }
      total
    }
  }
`;

async function resetOntology(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation",
      "Discovery", "LexiconDecision", "IngredientMention" RESTART IDENTITY CASCADE
  `);
}

describe.skipIf(!hasTestDatabase)(
  "Ingredient card resolvers (integration)",
  () => {
    let cook: AuthUser;
    let admin: AuthUser;

    beforeEach(async () => {
      await resetDatabase();
      await resetOntology();
      await seedOntologyVocabulary();
      curation.isOpen = true;
      cook = await createUser({ username: "cook" });
      admin = await createUser({ username: "boss", admin: true });
    });

    afterAll(async () => {
      await resetOntology();
      await server.stop();
      await prisma.$disconnect();
    });

    async function createFood(
      name: string,
      plural: string | null
    ): Promise<string> {
      const result = await execute<{
        createIngredient: { success: boolean; id: string };
      }>(server, cook, CREATE, { input: { name, plural } });
      expect(result.data?.createIngredient.success).toBe(true);
      return result.data!.createIngredient.id;
    }

    it("lets any signed-in cook add foods and edit them from the card", async () => {
      const chickenId = await createFood("chicken", null);
      const thighId = await createFood("chicken thigh", "chicken thighs");

      const listed = await execute<{
        ingredients: { name: string; isReviewed: boolean }[];
        ingredientCounts: { all: number; unreviewed: number };
      }>(
        server,
        cook,
        `{ ingredients(view: all) { name isReviewed } ingredientCounts { all unreviewed } }`
      );
      expect(listed.data?.ingredients.map((item) => item.name)).toEqual([
        "chicken",
        "chicken thigh",
      ]);
      expect(listed.data?.ingredientCounts).toEqual({ all: 2, unreviewed: 0 });

      const saved = await execute<{
        saveIngredient: {
          success: boolean;
          nextId: string | null;
          effect: {
            changed: { typename: string; id: string }[];
            invalidatedDomains: string[];
            lexiconRevision: number | null;
          };
        };
      }>(server, cook, SAVE, {
        input: {
          id: thighId,
          name: "chicken thigh",
          plural: "chicken thighs",
          properties: ["MEAT", "VEGAN"],
          excludedProperties: ["GLUTEN"],
          isComposedIngredient: false,
          relationships: [
            { ingredientId: chickenId, relationshipType: "PART_OF" },
          ],
          substitutionIds: [],
          aliases: ["thigh meat"],
          categories: ["poultry"],
          tags: [],
          markReviewed: true,
          advanceToNext: false,
        },
      });
      expect(saved.data?.saveIngredient).toMatchObject({
        success: true,
        nextId: null,
      });
      expect(saved.data?.saveIngredient.effect.changed).toEqual([
        { typename: "Ingredient", id: thighId },
        { typename: "Concept", id: thighId },
      ]);
      expect(saved.data?.saveIngredient.effect.invalidatedDomains).toContain(
        "CONCEPTS"
      );
      expect(saved.data?.saveIngredient.effect.lexiconRevision).toEqual(
        expect.any(Number)
      );

      const detail = await execute<{
        ingredient: {
          aliases: { name: string }[];
          relationships: {
            relationshipType: string;
            ingredient: { id: string; name: string };
          }[];
          propertyStates: {
            property: string;
            explicit: string | null;
            inherited: string | null;
            inheritedFrom: { name: string } | null;
          }[];
          dietaryTags: string[];
          isComposedIngredient: boolean;
          categories: string[];
        };
      }>(server, cook, DETAIL, { id: thighId });
      expect(detail.data?.ingredient).toMatchObject({
        aliases: [{ name: "thigh meat" }],
        relationships: [
          {
            relationshipType: "PART_OF",
            ingredient: { id: chickenId, name: "chicken" },
          },
        ],
        propertyStates: [
          {
            property: "MEAT",
            explicit: "TRUE",
            inherited: null,
            inheritedFrom: null,
          },
          {
            property: "GLUTEN",
            explicit: "FALSE",
            inherited: null,
            inheritedFrom: null,
          },
        ],
        dietaryTags: ["GLUTEN_FREE"],
        isComposedIngredient: false,
        categories: ["poultry"],
      });

      const search = await execute<{ searchIngredients: { name: string }[] }>(
        server,
        cook,
        `query ($excludeId: ID) { searchIngredients(query: "chick", excludeId: $excludeId) { name } }`,
        { excludeId: thighId }
      );
      expect(search.data?.searchIngredients).toEqual([{ name: "chicken" }]);

      const owner = await execute<{
        taken: { name: string } | null;
        own: { name: string } | null;
        free: { name: string } | null;
        long: { name: string } | null;
      }>(
        server,
        cook,
        `query ($thigh: ID!, $long: String!) {
          taken: ingredientNameOwner(name: "Chicken Thighs") { name }
          own: ingredientNameOwner(name: "chicken thighs", excludeId: $thigh) { name }
          free: ingredientNameOwner(name: "thigh meat", excludeId: "not-a-uuid") { name }
          long: ingredientNameOwner(name: $long) { name }
        }`,
        { thigh: thighId, long: "a".repeat(500) }
      );
      expect(owner.data).toEqual({
        taken: { name: "chicken thigh" },
        own: null,
        free: { name: "chicken thigh" },
        long: null,
      });

      const unchanged = await execute<{
        saveIngredient: {
          success: boolean;
          effect: {
            invalidatedDomains: string[];
            lexiconRevision: number | null;
          };
        };
      }>(server, cook, SAVE, {
        input: {
          id: chickenId,
          name: "chicken",
          plural: null,
          properties: [],
          isComposedIngredient: false,
          relationships: [],
          substitutionIds: [],
          aliases: [],
          categories: [],
          tags: [],
          markReviewed: true,
          advanceToNext: false,
        },
      });
      expect(unchanged.data?.saveIngredient).toMatchObject({
        success: true,
        effect: {
          invalidatedDomains: ["CONCEPTS", "CONCEPT_DETAIL"],
          lexiconRevision: null,
        },
      });
    });

    it("rejects invalid card input without changing anything", async () => {
      const chickenId = await createFood("chicken", null);
      const selfParent = await execute<{
        saveIngredient: { success: boolean; message: string };
      }>(server, cook, SAVE, {
        input: {
          id: chickenId,
          name: "chicken",
          plural: null,
          properties: [],
          isComposedIngredient: false,
          relationships: [
            { ingredientId: chickenId, relationshipType: "IS_A" },
          ],
          substitutionIds: [],
          aliases: [],
          categories: [],
          tags: [],
          markReviewed: true,
          advanceToNext: false,
        },
      });
      expect(selfParent.data?.saveIngredient.success).toBe(false);

      const emptyName = await execute<{
        createIngredient: { success: boolean; message: string };
      }>(server, cook, CREATE, { input: { name: "", plural: null } });
      expect(emptyName.data?.createIngredient.success).toBe(false);

      const missing = await execute<{ ingredient: null }>(
        server,
        cook,
        DETAIL,
        {
          id: "not-a-uuid",
        }
      );
      expect(missing.data?.ingredient).toBeNull();

      const tooLong = await execute<{ searchIngredients: unknown[] }>(
        server,
        cook,
        `query ($query: String!) { searchIngredients(query: $query) { name } }`,
        { query: "a".repeat(500) }
      );
      expect(tooLong.data?.searchIngredients).toEqual([]);

      const anonymous = await execute(
        server,
        null,
        `{ ingredientCounts { all } }`
      );
      expect(anonymous.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("keeps the lexicon to admins and lists what each name means", async () => {
      await createFood("chicken thigh", "chicken thighs");

      curation.isOpen = false;
      const forbidden = await execute(server, cook, LEXICON, {});
      expect(forbidden.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
      curation.isOpen = true;

      const foods = await execute<{
        lexicon: {
          items: {
            text: string;
            role: string;
            kind: string | null;
            targetLabel: string;
          }[];
          total: number;
        };
      }>(server, admin, LEXICON, { query: "thigh", role: "FOOD" });
      expect(foods.data?.lexicon.items).toEqual([
        expect.objectContaining({
          text: "chicken thigh",
          role: "FOOD",
          kind: "CANONICAL",
          targetLabel: "chicken thigh",
        }),
        expect.objectContaining({ text: "chicken thighs", kind: "PLURAL" }),
      ]);
      expect(foods.data?.lexicon.total).toBe(2);

      const unknownRole = await execute<{ lexicon: { total: number } }>(
        server,
        admin,
        `{ lexicon(query: "chicken thighs", role: "NOT_A_ROLE", page: 0) { total page } }`
      );
      expect(unknownRole.data?.lexicon).toEqual({ total: 1, page: 1 });
    });
  }
);

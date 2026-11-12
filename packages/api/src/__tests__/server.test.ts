import assert from "node:assert/strict";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getNotesPage: vi.fn(),
  getNoteDetail: vi.fn(),
  getImportStats: vi.fn(),
  getQueueJobByJobId: vi.fn(),
  getRecipesPage: vi.fn(),
  getRecipeDetail: vi.fn(),
  getRecipeTaxonomyOptions: vi.fn(),
  getIngredientSummaries: vi.fn(),
  getIngredientCounts: vi.fn(),
  getIngredientDetail: vi.fn(),
  getIngredientCategoryNames: vi.fn(),
  searchIngredients: vi.fn(),
  setIngredientLineReviewStatus: vi.fn(),
  promoteNoteToRecipe: vi.fn(),
  promoteCompletedNotesToRecipes: vi.fn(),
  updateRecipe: vi.fn(),
  saveIngredientDetails: vi.fn(),
  getNextUnreviewedIngredientId: vi.fn(),
  createIngredient: vi.fn(),
  cleanupAllData: vi.fn(),
  prisma: {},
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
    PrismaClientValidationError: class extends Error {},
    PrismaClientUnknownRequestError: class extends Error {},
    PrismaClientInitializationError: class extends Error {},
  },
}));

vi.mock("@peas/database", () => database);
vi.mock("../admin/cleanup-r2.js", () => ({
  cleanupR2Prefixes: vi.fn(async () => null),
}));

const { createApiServer } = await import("../server.js");

type Viewer = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  avatarUrl: string | null;
  userType: "ADMIN" | "USER";
};

const user: Viewer = {
  id: "u1",
  name: null,
  username: "allie",
  email: "allie@example.com",
  avatarUrl: null,
  userType: "USER",
};
const admin: Viewer = { ...user, id: "a1", userType: "ADMIN" };
const server = createApiServer({ development: false });

async function run(
  query: string,
  viewer: Viewer | null,
  variables?: Record<string, unknown>
) {
  const response = await server.executeOperation(
    { query, variables },
    { contextValue: { viewer } }
  );
  assert(response.body.kind === "single");
  return response.body.singleResult;
}

const EFFECT =
  "effect { changed { typename id } evicted { typename id } invalidatedDomains lexiconRevision reprocessingJobId }";

describe("GraphQL server", () => {
  beforeEach(() => vi.clearAllMocks());
  afterAll(() => server.stop());

  it("returns a null viewer when signed out and the viewer when signed in", async () => {
    expect((await run("{ viewer { id } }", null)).data).toEqual({
      viewer: null,
    });
    expect((await run("{ viewer { username userType } }", user)).data).toEqual({
      viewer: { username: "allie", userType: "USER" },
    });
  });

  it("rejects domain queries without a session", async () => {
    const result = await run("{ notes { total } }", null);
    expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    expect(database.getNotesPage).not.toHaveBeenCalled();
  });

  it("normalizes note filters before calling the repository", async () => {
    database.getNotesPage.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
    const result = await run(
      "query ($status: NoteStatus, $query: String, $page: Int) { notes(status: $status, query: $query, page: $page) { total page } }",
      user,
      { status: "FAILED", query: "  chili ", page: -3 }
    );
    expect(result.errors).toBeUndefined();
    expect(database.getNotesPage).toHaveBeenCalledWith({
      status: "FAILED",
      query: "chili",
      page: 1,
    });
  });

  it("returns the refreshed note from setLineReviewStatus with an empty effect", async () => {
    database.setIngredientLineReviewStatus.mockResolvedValue({
      id: "l1",
      noteId: "n1",
    });
    database.getNoteDetail.mockResolvedValue({
      id: "n1",
      title: "Chili",
      status: "COMPLETED",
      createdAt: "2026-11-12T00:00:00.000Z",
      errorMessage: null,
      duplicateConfidence: null,
      parsingErrorCount: 0,
      evernote: null,
      images: [],
      sources: [],
      categories: [],
      tags: [],
      ingredientBlocks: [],
      instructions: [],
      recipeId: null,
    });
    const result = await run(
      `mutation { setLineReviewStatus(lineId: "l1", status: CORRECT) { __typename success message note { id title } ${EFFECT} } }`,
      user
    );
    expect(database.setIngredientLineReviewStatus).toHaveBeenCalledWith(
      "l1",
      "CORRECT"
    );
    expect(result.data?.setLineReviewStatus).toEqual({
      __typename: "SetLineReviewStatusPayload",
      success: true,
      message: null,
      note: { id: "n1", title: "Chili" },
      effect: {
        changed: [],
        evicted: [],
        invalidatedDomains: [],
        lexiconRevision: null,
        reprocessingJobId: null,
      },
    });
  });

  it("reports validation failures in the payload instead of throwing", async () => {
    const result = await run(
      `mutation { updateRecipe(input: { id: "r1", title: "   ", categories: [], tags: [] }) { success message } }`,
      user
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.updateRecipe).toEqual({
      success: false,
      message: "title: Title is required",
    });
    expect(database.updateRecipe).not.toHaveBeenCalled();
  });

  it("never leaks database error details to the client", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    database.setIngredientLineReviewStatus.mockRejectedValue(
      new database.Prisma.PrismaClientKnownRequestError(
        "Invalid `prisma.parsedIngredientLine.update()` invocation in /src/note.ts",
        {
          code: "P2025",
        }
      )
    );
    const result = await run(
      `mutation { setLineReviewStatus(lineId: "gone", status: CORRECT) { success message } }`,
      user
    );
    expect(result.data?.setLineReviewStatus).toEqual({
      success: false,
      message: "That item no longer exists",
    });
  });

  it("describes what updateRecipe changed", async () => {
    database.updateRecipe.mockResolvedValue({ id: "r1" });
    const result = await run(
      `mutation { updateRecipe(input: { id: "r1", title: "Chili", categories: ["Dinner"], tags: [] }) { success ${EFFECT} } }`,
      user
    );
    expect(result.data?.updateRecipe).toMatchObject({
      success: true,
      effect: {
        changed: [{ typename: "Recipe", id: "r1" }],
        invalidatedDomains: ["RECIPES", "RECIPE_TAXONOMY"],
      },
    });
  });

  it("returns the next unreviewed ingredient when advancing", async () => {
    database.saveIngredientDetails.mockResolvedValue({
      id: "i1",
      name: "garlic",
    });
    database.getNextUnreviewedIngredientId.mockResolvedValue("i2");
    const result = await run(
      `mutation ($input: IngredientSaveInput!) { saveIngredient(input: $input) { success nextId ${EFFECT} } }`,
      user,
      {
        input: {
          id: "i1",
          name: "garlic",
          plural: null,
          properties: ["VEGAN"],
          isComposedIngredient: false,
          parentIngredientId: null,
          substitutionIds: [],
          aliases: [],
          category: null,
          tags: [],
          markReviewed: true,
          advanceToNext: true,
        },
      }
    );
    expect(database.getNextUnreviewedIngredientId).toHaveBeenCalledWith(
      "garlic",
      "i1"
    );
    expect(result.data?.saveIngredient).toMatchObject({
      success: true,
      nextId: "i2",
      effect: { invalidatedDomains: ["INGREDIENTS", "INGREDIENT_DETAIL"] },
    });
  });

  it("keeps admin-only mutations behind the admin role", async () => {
    const denied = await run(
      "mutation { cleanupAllData { success message deletedCounts { key count } } }",
      user
    );
    expect(denied.data?.cleanupAllData).toEqual({
      success: false,
      message: "Only admins can delete all data",
      deletedCounts: null,
    });
    expect(database.cleanupAllData).not.toHaveBeenCalled();

    database.cleanupAllData.mockResolvedValue({
      deletedCounts: { notes: 2, recipes: 1 },
    });
    const allowed = await run(
      `mutation { cleanupAllData { success deletedCounts { key count } ${EFFECT} } }`,
      admin
    );
    expect(allowed.data?.cleanupAllData).toMatchObject({
      success: true,
      deletedCounts: [
        { key: "notes", count: 2 },
        { key: "recipes", count: 1 },
      ],
      effect: {
        invalidatedDomains: expect.arrayContaining([
          "NOTES",
          "RECIPES",
          "INGREDIENTS",
          "IMPORT_STATS",
        ]),
      },
    });
  });

  it("resolves the MutationPayload interface for shared fragments", async () => {
    database.promoteNoteToRecipe.mockResolvedValue({ id: "r9" });
    const result = await run(
      `fragment Payload on MutationPayload { success }
       mutation { promoteNoteToRecipe(noteId: "n1") { __typename ...Payload recipeId } }`,
      user
    );
    expect(result.data?.promoteNoteToRecipe).toEqual({
      __typename: "PromoteNotePayload",
      success: true,
      recipeId: "r9",
    });
  });

  it("maps queue jobs for polling", async () => {
    database.getQueueJobByJobId.mockResolvedValue({
      jobId: "n1-ingredient-0-2",
      type: "PROCESS_INGREDIENT_LINE",
      status: "COMPLETED",
      noteId: "n1",
      errorMessage: null,
      retryCount: 0,
      startedAt: new Date("2026-11-12T15:23:03.000Z"),
      completedAt: new Date("2026-11-12T15:23:04.000Z"),
    });
    const result = await run(
      `{ job(jobId: "n1-ingredient-0-2") { status completedAt } }`,
      user
    );
    expect(result.data?.job).toEqual({
      status: "COMPLETED",
      completedAt: "2026-11-12T15:23:04.000Z",
    });
  });
});

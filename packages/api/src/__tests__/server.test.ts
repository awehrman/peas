import assert from "node:assert/strict";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getNotesPage: vi.fn(),
  getNoteDetail: vi.fn(),
  getImportStats: vi.fn(),
  getDashboardStats: vi.fn(),
  getQueueJobByJobId: vi.fn(),
  getReinterpretRun: vi.fn(),
  getRecipesPage: vi.fn(),
  getRecipeDetail: vi.fn(),
  getRecipeTaxonomyOptions: vi.fn(),
  getConceptRefs: vi.fn(),
  listIngredientSummaries: vi.fn(),
  getIngredientCardCounts: vi.fn(),
  getIngredientCard: vi.fn(),
  getIngredientCategoryOptions: vi.fn(),
  searchIngredientOptions: vi.fn(),
  saveIngredientCard: vi.fn(),
  createIngredientConcept: vi.fn(),
  reinterpretAffected: vi.fn(),
  addDecisionMentionsChanged: vi.fn(),
  listConcepts: vi.fn(),
  getCorpusHealth: vi.fn(),
  getCurrentRevision: vi.fn(),
  setClassification: vi.fn(),
  removeClassification: vi.fn(),
  setConceptTags: vi.fn(),
  setSubstitution: vi.fn(),
  removeSubstitution: vi.fn(),
  setIngredientLineReviewStatus: vi.fn(),
  promoteNoteToRecipe: vi.fn(),
  promoteCompletedNotesToRecipes: vi.fn(),
  updateRecipe: vi.fn(),
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

const curation = vi.hoisted(() => ({ isOpen: true }));
vi.mock("../context.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../context.js")>();
  return {
    ...actual,
    canCurateKnowledge: (
      viewer: Parameters<typeof actual.canCurateKnowledge>[0]
    ) => curation.isOpen || actual.isAdmin(viewer),
  };
});
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
  beforeEach(() => {
    vi.clearAllMocks();
    curation.isOpen = true;
  });
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

  it("serves dashboard stats only to signed-in viewers", async () => {
    const signedOut = await run("{ dashboardStats { noteCount } }", null);
    expect(signedOut.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    expect(database.getDashboardStats).not.toHaveBeenCalled();

    database.getDashboardStats.mockResolvedValue({
      noteCount: 3,
      recipeCount: 1,
      notesReadyToPromote: 1,
      conceptCount: 5,
      verifiedConceptCount: 2,
      instructionLineCount: 9,
      notesByStatus: {
        pending: 0,
        processing: 0,
        completed: 2,
        failed: 1,
        duplicate: 0,
      },
      ingredientLines: {
        total: 12,
        parsedSuccessfully: 11,
        parsedWithErrors: 1,
        awaitingParsing: 0,
        markedCorrect: 4,
        markedIncorrect: 1,
      },
      topConcepts: [{ conceptId: "c1", name: "garlic", lineCount: 3 }],
      topSources: [{ label: "Serious Eats", count: 2 }],
      topCategories: [],
      topTags: [],
      notesBySavedYear: [{ year: 2019, count: 3 }],
    });
    const result = await run(
      "{ dashboardStats { noteCount notesByStatus { failed } ingredientLines { parsedWithErrors } conceptCount topConcepts { name lineCount } notesBySavedYear { year count } } }",
      user
    );
    expect(result.data?.dashboardStats).toEqual({
      noteCount: 3,
      notesByStatus: { failed: 1 },
      ingredientLines: { parsedWithErrors: 1 },
      conceptCount: 5,
      topConcepts: [{ name: "garlic", lineCount: 3 }],
      notesBySavedYear: [{ year: 2019, count: 3 }],
    });
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
        invalidatedDomains: ["NOTE_DETAIL", "RECIPES", "RECIPE_TAXONOMY", "CATEGORIES"],
      },
    });
    expect(database.updateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: "r1", categories: ["Dinner"] }),
      expect.any(String)
    );
  });

  it("filters recipes by concept and names the concept", async () => {
    const conceptId = "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
    database.getRecipesPage.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 24,
    });
    database.getConceptRefs.mockResolvedValue([
      { id: conceptId, canonicalName: "chicken", status: "VERIFIED" },
    ]);
    const result = await run(
      `query ($conceptId: ID) { recipes(conceptId: $conceptId) { total concept { canonicalName } } }`,
      user,
      { conceptId }
    );
    expect(database.getRecipesPage).toHaveBeenCalledWith(
      expect.objectContaining({ conceptId, exactConcept: false })
    );
    expect(result.data?.recipes).toEqual({
      total: 0,
      concept: { canonicalName: "chicken" },
    });

    database.getConceptRefs.mockClear();
    await run(`{ recipes(conceptId: "not-a-uuid") { total } }`, user);
    expect(database.getRecipesPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ conceptId: undefined })
    );
    expect(database.getConceptRefs).not.toHaveBeenCalled();
  });

  it("serves the ingredient card list from food concepts, and keeps the concepts workbench to admins when curation is restricted", async () => {
    database.listIngredientSummaries.mockResolvedValue([
      {
        id: "c1",
        name: "chicken thigh",
        plural: "chicken thighs",
        isReviewed: true,
        parentIngredientId: "c0",
        properties: ["MEAT"],
        referenceCount: 3,
      },
    ]);
    database.getIngredientCardCounts.mockResolvedValue({
      all: 1,
      unreviewed: 2,
    });
    database.getIngredientCategoryOptions.mockResolvedValue(["Poultry"]);
    const result = await run(
      `{ ingredients(view: all) { name plural isReviewed properties referenceCount } ingredientCounts { all unreviewed } ingredientCategoryNames }`,
      user
    );
    expect(database.listIngredientSummaries).toHaveBeenCalledWith("all");
    expect(result.data).toEqual({
      ingredients: [
        {
          name: "chicken thigh",
          plural: "chicken thighs",
          isReviewed: true,
          properties: ["MEAT"],
          referenceCount: 3,
        },
      ],
      ingredientCounts: { all: 1, unreviewed: 2 },
      ingredientCategoryNames: ["Poultry"],
    });

    const missing = await run(`{ ingredient(id: "cm3legacy") { name } }`, user);
    expect(missing.data?.ingredient).toBeNull();
    expect(database.getIngredientCard).not.toHaveBeenCalled();

    curation.isOpen = false;
    const denied = await run("{ concepts { total } }", user);
    expect(denied.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(database.listConcepts).not.toHaveBeenCalled();
  });

  it("saves the ingredient card for any viewer and reinterprets after each decision", async () => {
    vi.stubEnv("QUEUE_AUTH_SECRET", "");
    const id = "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
    database.saveIngredientCard.mockResolvedValue({
      decisions: [
        {
          decisionId: "d1",
          revision: 14,
          payload: { type: "EDIT_CONCEPT", conceptId: id },
          effects: {},
        },
        {
          decisionId: "d2",
          revision: 15,
          payload: { type: "APPROVE_CONCEPT", conceptId: id },
          effects: {},
        },
      ],
      nextId: "next",
    });
    database.reinterpretAffected.mockResolvedValue({
      scope: { phrases: [], conceptIds: [id], mentionIds: [] },
      linesReprocessed: 2,
      mentionsChanged: 2,
      needsBackgroundReinterpret: false,
    });
    const result = await run(
      `mutation ($input: IngredientSaveInput!) { saveIngredient(input: $input) { success message nextId ${EFFECT} } }`,
      user,
      {
        input: {
          id,
          name: "green onion",
          plural: "green onions",
          properties: ["VEGAN"],
          isComposedIngredient: false,
          relationships: [],
          substitutionIds: [],
          aliases: ["scallion"],
          categories: [],
          tags: [],
          markReviewed: true,
          advanceToNext: true,
        },
      }
    );
    vi.unstubAllEnvs();
    expect(database.saveIngredientCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        name: "green onion",
        relationships: [],
        advanceToNext: true,
      }),
      user.id
    );
    expect(database.reinterpretAffected).toHaveBeenCalledTimes(2);
    expect(database.addDecisionMentionsChanged).toHaveBeenCalledWith(
      { id: "d1" },
      2
    );
    expect(result.data?.saveIngredient).toMatchObject({
      success: true,
      nextId: "next",
      effect: {
        changed: [
          { typename: "Ingredient", id },
          { typename: "Concept", id },
        ],
        lexiconRevision: 15,
        invalidatedDomains: expect.arrayContaining([
          "CONCEPTS",
          "MENTIONS",
          "NOTE_DETAIL",
        ]),
      },
    });

    const invalid = await run(
      `mutation ($input: IngredientSaveInput!) { saveIngredient(input: $input) { success message } }`,
      user,
      {
        input: {
          id,
          name: "leek",
          plural: "Leek",
          properties: [],
          isComposedIngredient: false,
          relationships: [{ ingredientId: id, relationshipType: "IS_A" }],
          substitutionIds: [],
          aliases: [],
          categories: [],
          tags: [],
          markReviewed: true,
          advanceToNext: false,
        },
      }
    );
    expect(invalid.data?.saveIngredient).toEqual({
      success: false,
      message: "plural: Plural must be different from the name",
    });
  });

  it("adds an approved food from the add-ingredient dialog", async () => {
    vi.stubEnv("QUEUE_AUTH_SECRET", "");
    database.createIngredientConcept.mockResolvedValue({
      id: "new-id",
      decision: {
        decisionId: "d3",
        revision: 16,
        payload: { type: "CREATE_CONCEPT" },
        effects: {},
      },
    });
    database.reinterpretAffected.mockResolvedValue({
      scope: { phrases: ["shallot"], conceptIds: [], mentionIds: [] },
      linesReprocessed: 0,
      mentionsChanged: 0,
      needsBackgroundReinterpret: false,
    });
    const result = await run(
      `mutation { createIngredient(input: { name: "shallot", plural: "shallots" }) { success id ${EFFECT} } }`,
      user
    );
    vi.unstubAllEnvs();
    expect(database.createIngredientConcept).toHaveBeenCalledWith(
      { name: "shallot", plural: "shallots" },
      user.id
    );
    expect(result.data?.createIngredient).toMatchObject({
      success: true,
      id: "new-id",
      effect: { lexiconRevision: 16 },
    });
  });

  it("edits concepts for curators and reports what changed", async () => {
    const conceptId = "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
    const mutation = `mutation ($conceptId: ID!, $tags: [String!]!) { setConceptTags(conceptId: $conceptId, tags: $tags) { success message ${EFFECT} } }`;

    curation.isOpen = false;
    const denied = await run(mutation, user, { conceptId, tags: ["pantry"] });
    expect(denied.data?.setConceptTags).toMatchObject({
      success: false,
      message: "You can't edit concepts yet",
    });
    expect(database.setConceptTags).not.toHaveBeenCalled();
    curation.isOpen = true;

    database.setConceptTags.mockResolvedValue(["pantry"]);
    const allowed = await run(mutation, admin, {
      conceptId,
      tags: [" pantry "],
    });
    expect(database.setConceptTags).toHaveBeenCalledWith(conceptId, ["pantry"]);
    expect(allowed.data?.setConceptTags).toMatchObject({
      success: true,
      effect: {
        changed: [{ typename: "Concept", id: conceptId }],
        invalidatedDomains: ["CONCEPT_DETAIL"],
      },
    });
  });

  it("serves corpus health to curators, without live metrics when the queue is unreachable", async () => {
    curation.isOpen = false;
    const denied = await run("{ corpusHealth { lineCount } }", user);
    expect(denied.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    curation.isOpen = true;

    vi.stubEnv("QUEUE_AUTH_SECRET", "");
    database.getCorpusHealth.mockResolvedValue({
      lineCount: 10,
      linesWithMentions: 9,
      parsedSuccessfully: 8,
      parsedWithErrors: 1,
      awaitingParsing: 1,
      mentions: {
        total: 12,
        AUTO_RESOLVED: 7,
        NEEDS_REVIEW: 2,
        UNRESOLVED: 2,
        VERIFIED: 1,
      },
      openDiscoveryCount: 4,
      topUnknownPhrases: [
        { discoveryId: "d1", phrase: "gochugaru", mentionCount: 3 },
      ],
      reinterpretBacklog: {
        pending: 0,
        processing: 1,
        failed: 0,
        failedBatches: 0,
      },
    });
    database.getCurrentRevision.mockResolvedValue(15);
    const result = await run(
      "{ corpusHealth { lineCount mentions { total unresolved verified } topUnknownPhrases { phrase } reinterpretBacklog { processing } lexiconRevision live { lineCount } } }",
      admin
    );
    vi.unstubAllEnvs();
    expect(result.data?.corpusHealth).toEqual({
      lineCount: 10,
      mentions: { total: 12, unresolved: 2, verified: 1 },
      topUnknownPhrases: [{ phrase: "gochugaru" }],
      reinterpretBacklog: { processing: 1 },
      lexiconRevision: 15,
      live: null,
    });
  });

  it("validates classification and substitution input", async () => {
    const conceptId = "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
    const category = await run(
      `mutation { setConceptClassification(input: { conceptId: "${conceptId}", kind: CATEGORY, key: "Spices", value: TRUE }) { success message } }`,
      admin
    );
    expect(category.data?.setConceptClassification).toEqual({
      success: false,
      message: "key: Category keys look like CATEGORY:<name>",
    });

    const self = await run(
      `mutation { setConceptSubstitution(input: { conceptId: "${conceptId}", substituteId: "${conceptId}" }) { success message } }`,
      admin
    );
    expect(self.data?.setConceptSubstitution).toEqual({
      success: false,
      message: "substituteId: A concept can't substitute for itself",
    });

    database.removeClassification.mockResolvedValue(false);
    const missing = await run(
      `mutation { removeConceptClassification(conceptId: "${conceptId}", key: "VEGAN") { success message } }`,
      admin
    );
    expect(missing.data?.removeConceptClassification).toEqual({
      success: false,
      message: "“VEGAN” is not set on this concept",
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
          "CONCEPTS",
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

  it("reports background reinterpretation runs with progress counts", async () => {
    database.getQueueJobByJobId.mockResolvedValue(null);
    database.getReinterpretRun.mockResolvedValue({
      jobId: "reinterpret-15",
      status: "PROCESSING",
      totalLines: 1200,
      processedLines: 400,
      failedBatches: 0,
      errorMessage: null,
      startedAt: new Date("2026-11-12T15:23:03.000Z"),
      completedAt: null,
    });
    const result = await run(
      `{ job(jobId: "reinterpret-15") { type status noteId processedCount totalCount completedAt } }`,
      user
    );
    expect(database.getReinterpretRun).toHaveBeenCalledWith("reinterpret-15");
    expect(result.data?.job).toEqual({
      type: "REINTERPRET",
      status: "PROCESSING",
      noteId: null,
      processedCount: 400,
      totalCount: 1200,
      completedAt: null,
    });
  });

  it("returns null for unknown job ids", async () => {
    database.getQueueJobByJobId.mockResolvedValue(null);
    database.getReinterpretRun.mockResolvedValue(null);
    const result = await run(`{ job(jobId: "missing") { status } }`, user);
    expect(result.data?.job).toBeNull();
  });
});

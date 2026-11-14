import assert from "node:assert/strict";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  getImportReviewCounts: vi.fn(),
  listDuplicateCandidates: vi.fn(),
  getDuplicateCandidate: vi.fn(),
  previewDuplicateResolution: vi.fn(),
  resolveDuplicate: vi.fn(),
  undoDuplicateResolution: vi.fn(),
  resolveExactDuplicatesBatch: vi.fn(),
  listBookLookups: vi.fn(),
  getBookLookup: vi.fn(),
  selectBookCandidate: vi.fn(),
  createBookManually: vi.fn(),
  leaveBookUnresolved: vi.fn(),
  resetBookLookup: vi.fn(),
  listFailedUrlChecks: vi.fn(),
  listCategories: vi.fn(),
  getCategory: vi.fn(),
  addCategoryToNote: vi.fn(),
  approveCategory: vi.fn(),
  excludeCategory: vi.fn(),
  restoreCategory: vi.fn(),
  removeCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategoryRule: vi.fn(),
  prisma: {},
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {},
    PrismaClientValidationError: class extends Error {},
    PrismaClientUnknownRequestError: class extends Error {},
    PrismaClientInitializationError: class extends Error {},
  },
}));
vi.mock("@peas/database", () => database);

const queue = vi.hoisted(() => ({
  requestUrlRecheck: vi.fn(async () => "url-check-u1"),
  requestBookLookup: vi.fn(async () => "book-lookup-l1"),
  requestCategoryRecompute: vi.fn(async () => "categories-category-c1-v2"),
}));
vi.mock("../queue-client.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../queue-client.js")>()),
  ...queue,
}));

const { createApiServer } = await import("../server.js");

const user = {
  id: "u1",
  name: null,
  username: "allie",
  email: "allie@example.com",
  avatarUrl: null,
  userType: "USER" as const,
};
const admin = { ...user, id: "a1", userType: "ADMIN" as const };
const server = createApiServer({ development: false });

async function run(query: string, viewer: typeof user | typeof admin | null, variables?: Record<string, unknown>) {
  const response = await server.executeOperation({ query, variables }, { contextValue: { viewer } });
  assert(response.body.kind === "single");
  return response.body.singleResult;
}

const PREVIEW = {
  keptNote: { id: "n-old", title: "Chili" },
  archivedNote: { id: "n-new", title: "Chili" },
  attachedSources: [{ sourceId: "s1", label: "https://example.com/chili", inactive: false }],
  primarySourceChange: null,
  carriedCategories: [],
  carriedTags: [],
  movedRecipeId: null,
  summary: ['Keep "Chili" and archive "Chili" (reversible; nothing is deleted).'],
};

describe("import integrity resolvers", () => {
  beforeEach(() => vi.clearAllMocks());
  afterAll(() => server.stop());

  it("resolves a duplicate as two separate choices and reports what changed", async () => {
    database.resolveDuplicate.mockResolvedValue({ noteIds: ["n-new", "n-old"], alreadyResolved: false, preview: PREVIEW });
    const result = await run(
      `mutation { resolveDuplicate(id: "d1", input: { keep: EXISTING, mergeSources: true }) { success preview { summary attachedSources { label } } effect { changed { typename id } invalidatedDomains } } }`,
      user
    );
    expect(database.resolveDuplicate).toHaveBeenCalledWith("d1", { keep: "EXISTING", mergeSources: true }, "u1");
    expect(result.data?.resolveDuplicate).toMatchObject({
      success: true,
      preview: { attachedSources: [{ label: "https://example.com/chili" }] },
      effect: {
        changed: expect.arrayContaining([{ typename: "Note", id: "n-new" }, { typename: "Note", id: "n-old" }]),
        invalidatedDomains: expect.arrayContaining(["IMPORT_REVIEW", "NOTES", "CATEGORIES"]),
      },
    });
  });

  it("returns a domain error as a failed payload, not a GraphQL error", async () => {
    database.resolveDuplicate.mockRejectedValue(new Error("This pair was already decided. Undo that decision first."));
    const result = await run(
      `mutation { resolveDuplicate(id: "d1", input: { keep: INCOMING, mergeSources: false }) { success message } }`,
      user
    );
    expect(result.errors).toBeUndefined();
    expect(result.data?.resolveDuplicate).toEqual({
      success: false,
      message: "This pair was already decided. Undo that decision first.",
    });
  });

  it("lists book lookups waiting for review by default", async () => {
    database.listBookLookups.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    await run(`{ bookLookups { total } }`, user);
    expect(database.listBookLookups).toHaveBeenCalledWith({ statuses: ["AMBIGUOUS", "NO_MATCH", "ERROR"], page: 1 });
  });

  it("validates manual books before saving", async () => {
    const result = await run(
      `mutation { createBookManually(lookupId: "l1", input: { title: "  ", authors: [] }) { success message } }`,
      user
    );
    expect(result.data?.createBookManually).toMatchObject({ success: false, message: expect.stringContaining("title") });
    expect(database.createBookManually).not.toHaveBeenCalled();
  });

  it("queues a URL recheck and a lookup retry through the queue service", async () => {
    await run(`mutation { recheckUrl(urlId: "u-1") { success } }`, user);
    expect(queue.requestUrlRecheck).toHaveBeenCalledWith("u-1", "u1");

    await run(`mutation { retryBookLookup(lookupId: "l-1") { success } }`, user);
    expect(database.resetBookLookup).toHaveBeenCalledWith("l-1");
    expect(queue.requestBookLookup).toHaveBeenCalledWith("l-1", "u1");
  });

  it("records category decisions with the reviewer", async () => {
    for (const field of ["approveCategory", "excludeCategory", "restoreCategory", "removeCategory"] as const) {
      const result = await run(`mutation { ${field}(noteId: "n1", categoryId: "c1") { success } }`, user);
      expect(result.data?.[field]).toEqual({ success: true });
    }
    expect(database.excludeCategory).toHaveBeenCalledWith({ noteId: "n1", categoryId: "c1", userId: "u1" });
  });

  it("lets only admins create or change category rules, and recomputes after a rule change", async () => {
    const denied = await run(`mutation { createCategory(input: { name: "Chicken" }) { success message } }`, user);
    expect(denied.data?.createCategory).toMatchObject({ success: false });
    expect(database.createCategory).not.toHaveBeenCalled();

    database.updateCategoryRule.mockResolvedValue({ ruleChanged: true });
    const result = await run(
      `mutation { updateCategoryRule(id: "c1", input: { name: "Chicken", conceptId: "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b", traversal: [IS_A, PART_OF, DERIVED_FROM] }) { success } }`,
      admin
    );
    expect(result.data?.updateCategoryRule).toEqual({ success: true });
    expect(database.updateCategoryRule).toHaveBeenCalledWith("c1", {
      name: "Chicken",
      description: null,
      conceptId: "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
      traversal: ["IS_A", "PART_OF", "DERIVED_FROM"],
    });
    expect(queue.requestCategoryRecompute).toHaveBeenCalledWith({ categoryId: "c1" }, "a1");
  });

  it("requires a signed-in user", async () => {
    const result = await run(`{ importReviewCounts { exactDuplicates } }`, null);
    expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });
});

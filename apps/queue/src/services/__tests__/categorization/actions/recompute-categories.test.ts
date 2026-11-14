import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@peas/database", () => ({
  recomputeNoteCategories: vi.fn(async () => ({ added: 1, updated: 0, removed: 0 })),
  recomputeCategory: vi.fn(async () => ({ added: 4, updated: 1, removed: 2 })),
  recomputeAllConceptCategories: vi.fn(async () => ({ added: 0, updated: 0, removed: 0 })),
}));

import { recomputeCategory, recomputeNoteCategories } from "@peas/database";

import { RecomputeNoteCategoriesAction } from "../../../categorization/actions/recompute-categories/action";
import {
  recomputeCategoriesForNote,
  recomputeEveryCategory,
  recomputeOneCategory,
} from "../../../categorization/actions/recompute-categories/service";
import { enqueueCategoryRecompute } from "../../../categorization/recompute";
import type { CategorizationWorkerDependencies } from "../../../../workers/categorization/dependencies";

const logger = { log: vi.fn() };
const context = {
  jobId: "j",
  retryCount: 0,
  queueName: "categorization",
  operation: "categorization",
  startTime: 0,
  workerName: "categorization",
  attemptNumber: 1,
};

describe("category recompute services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recomputes one note and reports the summary", async () => {
    const result = await recomputeCategoriesForNote({ noteId: "n1", importId: "i1", jobId: "j" }, logger);
    expect(recomputeNoteCategories).toHaveBeenCalledWith("n1");
    expect(result.metadata?.categorySummary).toEqual({ added: 1, updated: 0, removed: 0 });
  });

  it("recomputes one category", async () => {
    await recomputeOneCategory({ noteId: "", importId: "", jobId: "j", categoryId: "c1" }, logger);
    expect(recomputeCategory).toHaveBeenCalledWith("c1");
    await expect(recomputeOneCategory({ noteId: "", importId: "", jobId: "j" }, logger)).rejects.toThrow("categoryId");
  });

  it("recomputes every category and requires a note id for note recomputes", async () => {
    const result = await recomputeEveryCategory({ noteId: "", importId: "", jobId: "j" }, logger);
    expect(result.metadata?.categorySummary).toEqual({ added: 0, updated: 0, removed: 0 });
    await expect(recomputeCategoriesForNote({ noteId: "", importId: "", jobId: "j" }, logger)).rejects.toThrow("noteId");
  });
});

describe("RecomputeNoteCategoriesAction", () => {
  function deps(recompute: () => Promise<unknown>): CategorizationWorkerDependencies {
    return {
      logger,
      services: {
        determineCategory: vi.fn(),
        saveCategory: vi.fn(),
        determineTags: vi.fn(),
        saveTags: vi.fn(),
        recomputeNoteCategories: vi.fn(recompute),
        recomputeCategory: vi.fn(),
        recomputeAllCategories: vi.fn(),
      },
    } as unknown as CategorizationWorkerDependencies;
  }

  it("never fails the import pipeline when recomputation fails", async () => {
    const action = new RecomputeNoteCategoriesAction();
    const data = { noteId: "n1", importId: "i1", jobId: "j" };
    await expect(action.execute(data, deps(async () => { throw new Error("db down"); }), context)).resolves.toBe(data);
  });

  it("fails a dedicated recompute job so it retries", async () => {
    const action = new RecomputeNoteCategoriesAction();
    const data = { noteId: "n1", importId: "", jobId: "j", kind: "RECOMPUTE_NOTE_CATEGORIES" as const };
    await expect(action.execute(data, deps(async () => { throw new Error("db down"); }), context)).rejects.toThrow("db down");
  });
});

describe("enqueueCategoryRecompute", () => {
  it("collapses repeated requests for the same change", async () => {
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
    await expect(enqueueCategoryRecompute(queue as never, { scope: "ALL", reason: "revision 15" })).resolves.toBe(
      "categories-all-revision-15"
    );
    await expect(
      enqueueCategoryRecompute(queue as never, { scope: "CATEGORY", categoryId: "c1", ruleVersion: 2 })
    ).resolves.toBe("categories-category-c1-v2");
    expect(queue.add).toHaveBeenLastCalledWith(
      "recompute-categories",
      expect.objectContaining({ kind: "RECOMPUTE_CATEGORY", categoryId: "c1" }),
      expect.objectContaining({ jobId: "categories-category-c1-v2", attempts: 3 })
    );
  });
});

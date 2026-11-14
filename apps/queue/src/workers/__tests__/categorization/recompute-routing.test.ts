import { describe, expect, it, vi } from "vitest";

const recompute = vi.hoisted(() => ({
  recomputeCategoriesForNote: vi.fn(async (data: unknown) => data),
  recomputeOneCategory: vi.fn(async (data: unknown) => data),
  recomputeEveryCategory: vi.fn(async (data: unknown) => data),
}));
vi.mock("../../../services/categorization/actions/recompute-categories/service", () => recompute);

import {
  RecomputeAllCategoriesAction,
  RecomputeCategoryAction,
} from "../../../services/categorization/actions/recompute-categories/action";
import { ActionName } from "../../../types";
import { buildCategorizationDependencies } from "../../categorization/dependencies";
import { createCategorizationPipeline } from "../../categorization/pipeline";

const context = {
  jobId: "j",
  retryCount: 0,
  queueName: "categorization",
  operation: "categorization",
  startTime: 0,
  workerName: "categorization",
  attemptNumber: 1,
};

describe("categorization recompute routing", () => {
  it("runs a single action for each recompute job kind", () => {
    const factory = { create: vi.fn((name: ActionName) => ({ name })) };
    const deps = { logger: { log: vi.fn() } } as never;
    const base = { noteId: "", importId: "", jobId: "j" };
    const pick = (kind: "RECOMPUTE_NOTE_CATEGORIES" | "RECOMPUTE_CATEGORY" | "RECOMPUTE_ALL_CATEGORIES") =>
      createCategorizationPipeline(factory as never, deps, { ...base, kind }, context).map((action) => action.name);

    expect(pick("RECOMPUTE_NOTE_CATEGORIES")).toEqual([ActionName.RECOMPUTE_NOTE_CATEGORIES]);
    expect(pick("RECOMPUTE_CATEGORY")).toEqual([ActionName.RECOMPUTE_CATEGORY]);
    expect(pick("RECOMPUTE_ALL_CATEGORIES")).toEqual([ActionName.RECOMPUTE_ALL_CATEGORIES]);
  });

  it("wires the recompute services into the worker dependencies", async () => {
    const deps = buildCategorizationDependencies({ logger: { log: vi.fn() }, statusBroadcaster: undefined } as never);
    const data = { noteId: "n1", importId: "", jobId: "j", categoryId: "c1" };
    await deps.services.recomputeNoteCategories(data);
    await deps.services.recomputeCategory(data);
    await deps.services.recomputeAllCategories(data);
    expect(recompute.recomputeCategoriesForNote).toHaveBeenCalledWith(data, expect.anything());
    expect(recompute.recomputeOneCategory).toHaveBeenCalledWith(data, expect.anything());
    expect(recompute.recomputeEveryCategory).toHaveBeenCalledWith(data, expect.anything());
  });

  it("category and corpus-wide actions delegate to their services", async () => {
    const services = {
      recomputeCategory: vi.fn(async (data) => data),
      recomputeAllCategories: vi.fn(async (data) => data),
    };
    const deps = { logger: { log: vi.fn() }, services } as never;
    const data = { noteId: "", importId: "", jobId: "j", categoryId: "c1" };
    await new RecomputeCategoryAction().execute(data, deps, context);
    await new RecomputeAllCategoriesAction().execute(data, deps, context);
    expect(services.recomputeCategory).toHaveBeenCalledWith(data);
    expect(services.recomputeAllCategories).toHaveBeenCalledWith(data);
  });
});

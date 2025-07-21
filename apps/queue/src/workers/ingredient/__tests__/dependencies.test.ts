import { Mocked, beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientService } from "../../../services/ingredient";
import { createMockServiceContainer } from "../../__tests__/test-utils";
import { createIngredientWorkerDependencies } from "../dependencies";

vi.mock("../../../services/ingredient");

describe("createIngredientWorkerDependencies", () => {
  let container: ReturnType<typeof createMockServiceContainer>;
  let ingredientServiceMock: Mocked<IngredientService>;

  beforeEach(() => {
    container = createMockServiceContainer();
    // Vitest mock constructor: clear previous calls
    vi.clearAllMocks();
    // Vitest mock constructor: create mock instance
    ingredientServiceMock = vi.mocked(new IngredientService(container));
    // Vitest mock constructor: set implementation
    vi.mocked(IngredientService).mockImplementation(
      () => ingredientServiceMock
    );
    ingredientServiceMock.parseIngredient = vi
      .fn()
      .mockResolvedValue({ success: true });
  });

  it("wires up all base dependencies", () => {
    const deps = createIngredientWorkerDependencies(container);
    expect(deps.database).toBe(container.database);
    expect(deps.categorizationQueue).toBe(container.queues.categorizationQueue);
    expect(typeof deps.parseIngredient).toBe("function");
    expect(deps.addStatusEventAndBroadcast).toBeDefined();
    expect(deps.logger).toBeDefined();
  });

  it("delegates parseIngredient to IngredientService", async () => {
    const deps = createIngredientWorkerDependencies(container);
    await deps.parseIngredient("test");
    expect(ingredientServiceMock.parseIngredient).toHaveBeenCalledWith("test");
  });

  it("returns a new IngredientService instance per call", async () => {
    const deps1 = createIngredientWorkerDependencies(container);
    const deps2 = createIngredientWorkerDependencies(container);
    expect(deps1.parseIngredient).not.toBe(deps2.parseIngredient);
  });

  it("handles missing categorizationQueue gracefully", () => {
    // @ts-expect-error removing categorizationQueue for test coverage
    delete container.queues.categorizationQueue;
    const deps = createIngredientWorkerDependencies(container);
    expect(deps.categorizationQueue).toBeUndefined();
  });

  it("throws if container is missing required fields", () => {
    // @ts-expect-error passing empty object for test coverage
    expect(() => createIngredientWorkerDependencies({})).toThrow();
  });
});

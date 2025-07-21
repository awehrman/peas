import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IngredientService,
  IngredientServiceContainer,
} from "../../ingredient";

interface MockLogger {
  log: ReturnType<typeof vi.fn>;
}

function createMockLogger(): MockLogger {
  return { log: vi.fn() };
}
function createMockContainer(): IngredientServiceContainer {
  return { logger: createMockLogger() };
}

describe("IngredientService", () => {
  let service: IngredientService;
  let container: IngredientServiceContainer;

  beforeEach(() => {
    container = createMockContainer();
    service = new IngredientService(container);
  });

  it("can be constructed with a container", () => {
    expect(service).toBeInstanceOf(IngredientService);
  });
});

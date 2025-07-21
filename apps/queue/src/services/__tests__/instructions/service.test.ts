import { beforeEach, describe, expect, it, vi } from "vitest";

import { InstructionService } from "../../instruction";

interface MockLogger {
  log: ReturnType<typeof vi.fn>;
}
interface MockContainer {
  logger: MockLogger;
}

function createMockLogger(): MockLogger {
  return { log: vi.fn() };
}

function createMockContainer(): MockContainer {
  return { logger: createMockLogger() };
}

describe("InstructionService", () => {
  let service: InstructionService;
  let container: MockContainer;

  beforeEach(() => {
    container = createMockContainer();
    service = new InstructionService(container);
  });

  it("can be constructed with a container", () => {
    expect(service).toBeInstanceOf(InstructionService);
    expect((service as unknown as { container: MockContainer }).container).toBe(
      container
    );
  });
});

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

describe("InstructionService.updateInstructionLine", () => {
  let service: InstructionService;
  let container: MockContainer;
  let logger: MockLogger;

  beforeEach(() => {
    container = createMockContainer();
    logger = container.logger;
    service = new InstructionService(container);
    vi.clearAllMocks();
  });

  it("logs and returns result", async () => {
    const result = await service.updateInstructionLine("id1", { foo: "bar" });
    expect(result).toEqual({ id: "id1", foo: "bar" });
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Updating instruction line id1 with data:")
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Successfully updated instruction line id1")
    );
  });

  it("logs and propagates errors", async () => {
    const error = new Error("fail");
    logger.log.mockImplementationOnce(() => {
      throw error;
    });
    await expect(
      service.updateInstructionLine("id2", { foo: "bar" })
    ).rejects.toThrow("fail");
  });
});

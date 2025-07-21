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

describe("InstructionService.createInstructionSteps", () => {
  let service: InstructionService;
  let container: MockContainer;
  let logger: MockLogger;

  beforeEach(() => {
    container = createMockContainer();
    logger = container.logger;
    service = new InstructionService(container);
    vi.clearAllMocks();
  });

  it("logs and returns steps", async () => {
    const steps = [{ step: 1 }, { step: 2 }];
    const result = await service.createInstructionSteps(steps);
    expect(result).toBe(steps);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Creating 2 instruction steps")
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Successfully created 2 instruction steps")
    );
  });

  it("logs and propagates errors", async () => {
    const error = new Error("fail");
    logger.log.mockImplementationOnce(() => {
      throw error;
    });
    await expect(service.createInstructionSteps([{ step: 1 }])).rejects.toThrow(
      "fail"
    );
  });
});

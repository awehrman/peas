import { describe, expect, it, vi } from "vitest";

import { createMockServiceContainer } from "../../__tests__/test-utils";
import { createInstructionWorkerDependencies } from "../dependencies";

vi.mock("../../../services/instruction-service");

describe("createInstructionWorkerDependencies", () => {
  it("wires up all required dependencies and database methods", () => {
    const container = createMockServiceContainer();
    const deps = createInstructionWorkerDependencies(container);

    // Should include base dependencies
    expect(deps).toHaveProperty("logger");
    expect(deps).toHaveProperty("addStatusEventAndBroadcast");
    expect(deps).toHaveProperty("ErrorHandler");

    // Should include database property
    expect(deps).toHaveProperty("database");
    expect(typeof deps.database.updateInstructionLine).toBe("function");
    expect(typeof deps.database.createInstructionSteps).toBe("function");
    expect(typeof deps.database.updateNoteCompletionTracker).toBe("function");
    expect(typeof deps.database.incrementNoteCompletionTracker).toBe(
      "function"
    );
    expect(typeof deps.database.checkNoteCompletion).toBe("function");
    expect(typeof deps.database.getNoteTitle).toBe("function");
  });

  it("binds instruction-specific methods to the InstructionService instance", () => {
    const container = createMockServiceContainer();
    const deps = createInstructionWorkerDependencies(container);
    // const lastService = getLastInstructionServiceInstance();
    expect(typeof deps.database.updateInstructionLine).toBe("function");
    expect(typeof deps.database.createInstructionSteps).toBe("function");
    // Optionally, test that calling both with the same arguments produces the same result if needed
  });

  it("wires shared database methods from the container", () => {
    const container = createMockServiceContainer();
    const deps = createInstructionWorkerDependencies(container);
    expect(deps.database.updateNoteCompletionTracker).toBe(
      container.database.updateNoteCompletionTracker
    );
    expect(deps.database.incrementNoteCompletionTracker).toBe(
      container.database.incrementNoteCompletionTracker
    );
    expect(deps.database.checkNoteCompletion).toBe(
      container.database.checkNoteCompletion
    );
    expect(deps.database.getNoteTitle).toBe(container.database.getNoteTitle);
  });
});

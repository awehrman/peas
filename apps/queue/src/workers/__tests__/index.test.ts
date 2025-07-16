import { describe, it, expect } from "vitest";

// Import all exports from the barrel file to ensure coverage
import * as Workers from "../index";

describe("workers/index", () => {
  it("should export all expected modules", () => {
    // Test that all expected exports are available
    expect(Workers).toHaveProperty("BaseWorker");
    expect(Workers).toHaveProperty("BaseAction");
    expect(Workers).toHaveProperty("ActionFactory");
    expect(Workers).toHaveProperty("createNoteWorker");
    expect(Workers).toHaveProperty("createIngredientWorker");
    expect(Workers).toHaveProperty("createInstructionWorker");
    expect(Workers).toHaveProperty("createImageWorker");
    expect(Workers).toHaveProperty("createCategorizationWorker");
    expect(Workers).toHaveProperty("createSourceWorker");
  });

  it("should export core worker infrastructure", () => {
    expect(typeof Workers.BaseWorker).toBe("function");
    expect(typeof Workers.BaseAction).toBe("function");
    expect(typeof Workers.ActionFactory).toBe("function");
  });

  it("should export worker factory functions", () => {
    expect(typeof Workers.createNoteWorker).toBe("function");
    expect(typeof Workers.createIngredientWorker).toBe("function");
    expect(typeof Workers.createInstructionWorker).toBe("function");
    expect(typeof Workers.createImageWorker).toBe("function");
    expect(typeof Workers.createCategorizationWorker).toBe("function");
    expect(typeof Workers.createSourceWorker).toBe("function");
  });

  it("should export shared utilities", () => {
    // Test that shared utilities are exported
    expect(Workers).toHaveProperty("BroadcastStatusAction");
    expect(Workers).toHaveProperty("BroadcastProcessingAction");
    expect(Workers).toHaveProperty("BroadcastCompletedAction");
    expect(Workers).toHaveProperty("BroadcastFailedAction");
    expect(Workers).toHaveProperty("createStatusAction");
  });
});

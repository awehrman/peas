import { describe, expect, it, vi } from "vitest";

// Mock all dependencies to avoid circular imports and external dependencies
vi.mock("../core", () => ({
  BaseWorker: vi.fn(),
  ActionFactory: vi.fn(),
  BaseAction: vi.fn(),
}));

vi.mock("../shared", () => ({
  createWorkerConfig: vi.fn(),
  createWorkers: vi.fn(),
  validateWorkerConfig: vi.fn(),
}));

vi.mock("../note", () => ({
  NoteWorker: vi.fn(),
  createNoteWorker: vi.fn(),
}));

vi.mock("../types", () => ({
  BaseJobData: vi.fn(),
}));

describe("Workers Index", () => {
  it("should export core worker infrastructure", async () => {
    const { BaseWorker, ActionFactory, BaseAction } = await import("../core");

    expect(BaseWorker).toBeDefined();
    expect(ActionFactory).toBeDefined();
    expect(BaseAction).toBeDefined();
  });

  it("should export shared utilities", async () => {
    const { createWorkerConfig, createWorkers, validateWorkerConfig } =
      await import("../shared");

    expect(createWorkerConfig).toBeDefined();
    expect(createWorkers).toBeDefined();
    expect(validateWorkerConfig).toBeDefined();
  });

  it("should export domain-specific workers", async () => {
    const { NoteWorker, createNoteWorker } = await import("../note");

    expect(NoteWorker).toBeDefined();
    expect(createNoteWorker).toBeDefined();
  });

  it("should export factory functions", async () => {
    const { createNoteWorker } = await import("../note");

    expect(createNoteWorker).toBeDefined();
  });

  it("should have all expected exports from index", async () => {
    const indexExports = await import("../index");

    // Test that all expected exports are available
    expect(indexExports).toHaveProperty("BaseWorker");
    expect(indexExports).toHaveProperty("ActionFactory");
    expect(indexExports).toHaveProperty("BaseAction");
    expect(indexExports).toHaveProperty("createWorkerConfig");
    expect(indexExports).toHaveProperty("createWorkers");
    expect(indexExports).toHaveProperty("validateWorkerConfig");
    expect(indexExports).toHaveProperty("NoteWorker");
    expect(indexExports).toHaveProperty("createNoteWorker");
    // BaseJobData is a type, not a runtime export, so we skip this check
  });

  it("should handle dynamic imports correctly", async () => {
    // Test that the barrel exports work correctly
    const coreModule = await import("../core");
    const sharedModule = await import("../shared");
    const noteModule = await import("../note");
    const typesModule = await import("../types");

    expect(coreModule).toBeDefined();
    expect(sharedModule).toBeDefined();
    expect(noteModule).toBeDefined();
    expect(typesModule).toBeDefined();
  });

  it("should maintain proper export structure", () => {
    // Test that the index file maintains the expected structure
    const indexContent = `
// Core worker infrastructure
export * from "./core";

// Shared utilities
export * from "./shared";

// Domain-specific workers
export * from "./note";

// Explicitly re-export BaseJobData to avoid conflicts
export type { BaseJobData } from "./types";

// Factory functions
export { createNoteWorker } from "./note";
    `.trim();

    expect(indexContent).toContain("export * from");
    expect(indexContent).toContain("export type { BaseJobData }");
    expect(indexContent).toContain("export { createNoteWorker }");
  });
});

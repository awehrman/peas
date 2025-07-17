import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startWorkers } from "../startup";

// Mock all worker factories
vi.mock("../note", () => ({
  createNoteWorker: vi.fn(),
}));
vi.mock("../image", () => ({
  createImageWorker: vi.fn(),
}));
vi.mock("../ingredient", () => ({
  createIngredientWorker: vi.fn(),
}));
vi.mock("../instruction", () => ({
  createInstructionWorker: vi.fn(),
}));
vi.mock("../categorization", () => ({
  createCategorizationWorker: vi.fn(),
}));
vi.mock("../source", () => ({
  createSourceWorker: vi.fn(),
}));

import { createNoteWorker } from "../note";
import { createImageWorker } from "../image";
import { createIngredientWorker } from "../ingredient";
import { createInstructionWorker } from "../instruction";
import { createCategorizationWorker } from "../categorization";
import { createSourceWorker } from "../source";

describe("startWorkers", () => {
  let mockQueues: any;
  let mockServiceContainer: any;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Create mock service container
    mockServiceContainer = {
      logger: mockLogger,
      _workers: {},
    };

    // Create mock queues
    mockQueues = {
      noteQueue: { name: "note-queue" },
      imageQueue: { name: "image-queue" },
      ingredientQueue: { name: "ingredient-queue" },
      instructionQueue: { name: "instruction-queue" },
      categorizationQueue: { name: "categorization-queue" },
      sourceQueue: { name: "source-queue" },
    };

    // Mock worker factory returns
    (createNoteWorker as any).mockReturnValue({ name: "note-worker" });
    (createImageWorker as any).mockReturnValue({ name: "image-worker" });
    (createIngredientWorker as any).mockReturnValue({
      name: "ingredient-worker",
    });
    (createInstructionWorker as any).mockReturnValue({
      name: "instruction-worker",
    });
    (createCategorizationWorker as any).mockReturnValue({
      name: "categorization-worker",
    });
    (createSourceWorker as any).mockReturnValue({ name: "source-worker" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create and start all workers successfully", () => {
    startWorkers(mockQueues, mockServiceContainer);

    // Verify all worker factories were called with correct parameters
    expect(createNoteWorker).toHaveBeenCalledWith(
      mockQueues.noteQueue,
      mockServiceContainer
    );
    expect(createImageWorker).toHaveBeenCalledWith(
      mockQueues.imageQueue,
      mockServiceContainer
    );
    expect(createIngredientWorker).toHaveBeenCalledWith(
      mockQueues.ingredientQueue,
      mockServiceContainer
    );
    expect(createInstructionWorker).toHaveBeenCalledWith(
      mockQueues.instructionQueue,
      mockServiceContainer
    );
    expect(createCategorizationWorker).toHaveBeenCalledWith(
      mockQueues.categorizationQueue,
      mockServiceContainer
    );
    expect(createSourceWorker).toHaveBeenCalledWith(
      mockQueues.sourceQueue,
      mockServiceContainer
    );

    // Verify success messages were logged
    expect(mockLogger.log).toHaveBeenCalledWith(
      "✅ Note worker created and started"
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      "✅ Image worker created and started"
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      "✅ Ingredient worker created and started"
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      "✅ Instruction worker created and started"
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      "✅ Categorization worker created and started"
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      "✅ Source worker created and started"
    );
  });

  it("should store workers in service container for graceful shutdown", () => {
    startWorkers(mockQueues, mockServiceContainer);

    // Verify workers are stored in the service container
    expect(mockServiceContainer._workers).toEqual({
      noteWorker: { name: "note-worker" },
      imageWorker: { name: "image-worker" },
      ingredientWorker: { name: "ingredient-worker" },
      instructionWorker: { name: "instruction-worker" },
      categorizationWorker: { name: "categorization-worker" },
      sourceWorker: { name: "source-worker" },
    });
  });

  it("should handle errors during worker creation", () => {
    const error = new Error("Failed to create note worker");
    (createNoteWorker as any).mockImplementation(() => {
      throw error;
    });

    // Should throw the error
    expect(() => {
      startWorkers(mockQueues, mockServiceContainer);
    }).toThrow("Failed to create note worker");

    // Should log the error
    expect(mockLogger.log).toHaveBeenCalledWith(
      "❌ Failed to start workers: Error: Failed to create note worker",
      "error"
    );
  });

  it("should handle errors during any worker creation", () => {
    const error = new Error("Failed to create image worker");
    (createImageWorker as any).mockImplementation(() => {
      throw error;
    });

    // Should throw the error
    expect(() => {
      startWorkers(mockQueues, mockServiceContainer);
    }).toThrow("Failed to create image worker");

    // Should log the error
    expect(mockLogger.log).toHaveBeenCalledWith(
      "❌ Failed to start workers: Error: Failed to create image worker",
      "error"
    );
  });

  it("should handle non-Error exceptions", () => {
    const error = "String error";
    (createIngredientWorker as any).mockImplementation(() => {
      throw error;
    });

    // Should throw the error
    expect(() => {
      startWorkers(mockQueues, mockServiceContainer);
    }).toThrow("String error");

    // Should log the error
    expect(mockLogger.log).toHaveBeenCalledWith(
      "❌ Failed to start workers: String error",
      "error"
    );
  });

  it("should call worker factories in the correct order", () => {
    const callOrder: string[] = [];

    (createNoteWorker as any).mockImplementation(() => {
      callOrder.push("note");
      return { name: "note-worker" };
    });
    (createImageWorker as any).mockImplementation(() => {
      callOrder.push("image");
      return { name: "image-worker" };
    });
    (createIngredientWorker as any).mockImplementation(() => {
      callOrder.push("ingredient");
      return { name: "ingredient-worker" };
    });
    (createInstructionWorker as any).mockImplementation(() => {
      callOrder.push("instruction");
      return { name: "instruction-worker" };
    });
    (createCategorizationWorker as any).mockImplementation(() => {
      callOrder.push("categorization");
      return { name: "categorization-worker" };
    });
    (createSourceWorker as any).mockImplementation(() => {
      callOrder.push("source");
      return { name: "source-worker" };
    });

    startWorkers(mockQueues, mockServiceContainer);

    // Verify the order matches the implementation
    expect(callOrder).toEqual([
      "note",
      "image",
      "ingredient",
      "instruction",
      "categorization",
      "source",
    ]);
  });

  it("should not store workers if an error occurs", () => {
    const error = new Error("Failed to create worker");
    (createNoteWorker as any).mockImplementation(() => {
      throw error;
    });

    expect(() => {
      startWorkers(mockQueues, mockServiceContainer);
    }).toThrow();

    // Workers should not be stored if an error occurs
    expect(mockServiceContainer._workers).toEqual({});
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Queue } from "bullmq";
import { NoteWorker, createNoteWorker } from "../note-worker";
import { MissingDependencyError } from "../../core/errors";
import { registerNoteActions } from "../actions";
import type { NoteJobData } from "../types";

// Spy on registerNoteActions
vi.mock("../actions", () => ({
  registerNoteActions: vi.fn(),
}));

// Minimal BaseAction mock
function makeBaseActionMock(name: string) {
  return {
    name,
    execute: vi.fn(),
    executeWithTiming: vi.fn(),
    withConfig: vi.fn(),
    severity: "info",
  };
}

class TestNoteWorker extends NoteWorker {
  public wrappedActions: any[] = [];
  public errorHandledActions: any[] = [];
  public registerActionsCalled = false;

  protected registerActions(): void {
    this.registerActionsCalled = true;
    registerNoteActions(this.actionFactory);
  }

  protected createWrappedAction(name: string, deps: any) {
    this.wrappedActions.push({ name, deps });
    return makeBaseActionMock(name);
  }

  protected createErrorHandledAction(name: string, deps: any) {
    this.errorHandledActions.push({ name, deps });
    return makeBaseActionMock(name);
  }
}

describe("NoteWorker", () => {
  let mockQueue: Queue;
  let mockContainer: any;
  let mockDependencies: any;
  let worker: TestNoteWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "note-queue" } as any;
    mockContainer = {
      parsers: { parseHTML: vi.fn() },
      database: { createNote: vi.fn() },
      queues: {
        ingredientQueue: { name: "ingredient-queue" },
        instructionQueue: { name: "instruction-queue" },
        imageQueue: { name: "image-queue" },
        categorizationQueue: { name: "categorization-queue" },
        sourceQueue: { name: "source-queue" },
      },
    };
    mockDependencies = {
      parseHTML: vi.fn(),
      createNote: vi.fn(),
      ingredientQueue: mockContainer.queues.ingredientQueue,
      instructionQueue: mockContainer.queues.instructionQueue,
      imageQueue: mockContainer.queues.imageQueue,
      categorizationQueue: mockContainer.queues.categorizationQueue,
      sourceQueue: mockContainer.queues.sourceQueue,
      addStatusEventAndBroadcast: vi.fn(),
      ErrorHandler: { withErrorHandling: vi.fn() },
      logger: { log: vi.fn() },
    };
    worker = new TestNoteWorker(
      mockQueue,
      mockDependencies,
      undefined,
      mockContainer
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should extend NoteWorker and initialize correctly", () => {
    expect(worker).toBeInstanceOf(NoteWorker);
  });

  it("should call registerNoteActions during initialization", () => {
    expect(registerNoteActions).toHaveBeenCalledWith(
      (worker as any)["actionFactory"]
    );
  });

  it("getOperationName should return the correct operation name", () => {
    expect((worker as any)["getOperationName"]()).toBe("note_processing");
  });

  describe("validateDependencies", () => {
    it("should pass validation when all dependencies are present", () => {
      expect(() => worker.validateDependencies()).not.toThrow();
    });
    it("should throw MissingDependencyError when parseHTML is missing", () => {
      (worker as any)["container"].parsers!.parseHTML = undefined;
      expect(() => worker.validateDependencies()).toThrow(
        MissingDependencyError
      );
      expect(() => worker.validateDependencies()).toThrow(
        "parseHTML function is required"
      );
    });
    it("should throw MissingDependencyError when createNote is missing", () => {
      (worker as any)["container"].database!.createNote = undefined;
      expect(() => worker.validateDependencies()).toThrow(
        MissingDependencyError
      );
      expect(() => worker.validateDependencies()).toThrow(
        "createNote function is required"
      );
    });
    it("should throw MissingDependencyError when both dependencies are missing", () => {
      (worker as any)["container"].parsers!.parseHTML = undefined;
      (worker as any)["container"].database!.createNote = undefined;
      expect(() => worker.validateDependencies()).toThrow(
        MissingDependencyError
      );
    });
  });

  describe("createActionPipeline", () => {
    it("should create the correct pipeline with all actions", () => {
      const mockData = { content: "test content" } as NoteJobData;
      const mockContext = { jobId: "test-job" } as any;
      const pipeline = (worker as any)["createActionPipeline"](
        mockData,
        mockContext
      );
      expect(pipeline).toHaveLength(4); // parse_html, save_note, add_processing_status, add_completed_status
      expect(worker.wrappedActions).toEqual([
        { name: "parse_html", deps: mockDependencies },
        { name: "save_note", deps: mockDependencies },
      ]);
      expect(worker.errorHandledActions).toEqual([
        { name: "add_processing_status", deps: mockDependencies },
        { name: "add_completed_status", deps: mockDependencies },
      ]);
    });
    it("should not include schedule actions when they are commented out", () => {
      const mockData = { content: "test content" } as NoteJobData;
      const mockContext = { jobId: "test-job" } as any;
      (worker as any)["createActionPipeline"](mockData, mockContext);
      const scheduled = worker.errorHandledActions.map((a) => a.name);
      expect(scheduled).not.toContain("schedule_source");
      expect(scheduled).not.toContain("schedule_images");
      expect(scheduled).not.toContain("schedule_ingredients");
      expect(scheduled).not.toContain("schedule_instructions");
    });
  });

  describe("Type Checking Methods", () => {
    it("should throw error when getExpectedOutputType is called", () => {
      expect(() => worker.getExpectedOutputType()).toThrow(
        "This method is for type checking only"
      );
    });
    it("should throw error when getPipelineStageType is called", () => {
      expect(() => worker.getPipelineStageType(1)).toThrow(
        "This method is for type checking only"
      );
    });
  });
});

describe("createNoteWorker", () => {
  let mockQueue: Queue;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "note-queue" } as any;
    mockContainer = {
      parsers: { parseHTML: vi.fn() },
      database: { createNote: vi.fn() },
      queues: {
        ingredientQueue: { name: "ingredient-queue" },
        instructionQueue: { name: "instruction-queue" },
        imageQueue: { name: "image-queue" },
        categorizationQueue: { name: "categorization-queue" },
        sourceQueue: { name: "source-queue" },
      },
    };
  });

  it("should create a NoteWorker with correct dependencies", () => {
    const worker = createNoteWorker(mockQueue, mockContainer);
    expect(worker).toBeInstanceOf(NoteWorker);
    expect(worker.validateDependencies).toBeDefined();
  });
  it("should validate dependencies after creation", () => {
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    createNoteWorker(mockQueue, mockContainer);
    expect(validateSpy).toHaveBeenCalled();
  });
  it("should throw error when parseHTML is missing", () => {
    mockContainer.parsers.parseHTML = undefined;
    expect(() => createNoteWorker(mockQueue, mockContainer)).toThrow(
      MissingDependencyError
    );
  });
  it("should throw error when createNote is missing", () => {
    mockContainer.database.createNote = undefined;
    expect(() => createNoteWorker(mockQueue, mockContainer)).toThrow(
      MissingDependencyError
    );
  });
});

describe("createNoteDependenciesFromContainer", () => {
  let mockContainer: any;
  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = {
      parsers: { parseHTML: vi.fn().mockResolvedValue({ parsed: true }) },
      database: { createNote: vi.fn().mockResolvedValue({ id: "note-1" }) },
      queues: {
        ingredientQueue: { name: "ingredient-queue" },
        instructionQueue: { name: "instruction-queue" },
        imageQueue: { name: "image-queue" },
        categorizationQueue: { name: "categorization-queue" },
        sourceQueue: { name: "source-queue" },
      },
    };
  });
  function getDeps() {
    // Use the real createNoteWorker to get the dependencies
    const worker = createNoteWorker({} as any, mockContainer);
    return (worker as any).dependencies;
  }
  it("should create dependencies with correct queue references", () => {
    const deps = getDeps();
    expect(deps.ingredientQueue).toBe(mockContainer.queues.ingredientQueue);
    expect(deps.instructionQueue).toBe(mockContainer.queues.instructionQueue);
    expect(deps.imageQueue).toBe(mockContainer.queues.imageQueue);
    expect(deps.categorizationQueue).toBe(
      mockContainer.queues.categorizationQueue
    );
    expect(deps.sourceQueue).toBe(mockContainer.queues.sourceQueue);
  });
  it("should create parseHTML function that calls container parser", async () => {
    const deps = getDeps();
    const result = await deps.parseHTML("test content");
    expect(mockContainer.parsers.parseHTML).toHaveBeenCalledWith(
      "test content"
    );
    expect(result).toEqual({ parsed: true });
  });
  it("should create createNote function that calls container database", async () => {
    const deps = getDeps();
    const testFile = { content: "test" };
    const result = await deps.createNote(testFile);
    expect(mockContainer.database.createNote).toHaveBeenCalledWith(testFile);
    expect(result).toEqual({ id: "note-1" });
  });
  it("should throw error when parseHTML is not available", async () => {
    mockContainer.parsers.parseHTML = undefined;
    expect(() => getDeps()).toThrowError("parseHTML function is required");
  });
  it("should throw error when createNote is not available", async () => {
    mockContainer.database.createNote = undefined;
    expect(() => getDeps()).toThrowError("createNote function is required");
  });

  it("should throw error when parseHTML function is not available in container", async () => {
    // Create a container with parseHTML undefined but still present in parsers
    const testContainer = {
      ...mockContainer,
      parsers: { parseHTML: undefined },
    };

    // Mock the validateDependencies method to avoid the early throw
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    validateSpy.mockImplementation(() => {}); // No-op to avoid validation

    try {
      const worker = createNoteWorker({} as any, testContainer);
      const deps = (worker as any).dependencies;

      await expect(deps.parseHTML("test content")).rejects.toThrow(
        "parseHTML function not available"
      );
    } finally {
      validateSpy.mockRestore();
    }
  });

  it("should throw error when createNote function is not available in container", async () => {
    // Create a container with createNote undefined but still present in database
    const testContainer = {
      ...mockContainer,
      database: { createNote: undefined },
    };

    // Mock the validateDependencies method to avoid the early throw
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    validateSpy.mockImplementation(() => {}); // No-op to avoid validation

    try {
      const worker = createNoteWorker({} as any, testContainer);
      const deps = (worker as any).dependencies;
      const testFile = { content: "test" };

      await expect(deps.createNote(testFile)).rejects.toThrow(
        "createNote function not available"
      );
    } finally {
      validateSpy.mockRestore();
    }
  });

  it("should handle parseHTML when container.parsers is undefined", async () => {
    mockContainer.parsers = undefined;
    expect(() => getDeps()).toThrowError("parseHTML function is required");
  });

  it("should handle createNote when container.database is undefined", async () => {
    mockContainer.database = undefined;
    expect(() => getDeps()).toThrowError("createNote function is required");
  });
});

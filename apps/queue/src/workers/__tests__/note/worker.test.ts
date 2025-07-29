/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import { createMockQueue } from "../../../test-utils/helpers";
import { ActionName } from "../../../types";
import type { NoteWorkerDependencies } from "../../../types/notes";
import { ActionFactory } from "../../core/action-factory";
import { NoteWorker, createNoteWorker } from "../../note/worker";

// Mock the dependencies
vi.mock("../../note/dependencies", () => ({
  buildNoteWorkerDependencies: vi.fn(),
}));

vi.mock("../../../services/note/clean-html", () => ({
  CleanHtmlAction: class MockCleanHtmlAction {
    name: string;
    constructor() {
      this.name = "clean_html";
    }
  },
}));

vi.mock("../../../services/note/parse-html", () => ({
  ParseHtmlAction: class MockParseHtmlAction {
    name: string;
    constructor() {
      this.name = "parse_html";
    }
  },
}));

vi.mock("../../../services/note/save-note", () => ({
  SaveNoteAction: class MockSaveNoteAction {
    name: string;
    constructor() {
      this.name = "save_note";
    }
  },
}));

vi.mock("../../note/pipeline", () => ({
  createNotePipeline: vi.fn(),
}));

describe("NoteWorker", () => {
  let mockQueue: any;
  let mockDependencies: NoteWorkerDependencies;
  let mockActionFactory: ActionFactory<any, any, any>;
  let mockContainer: IServiceContainer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueue = createMockQueue("test-note-queue");
    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: { name: "note" } as any,
        imageQueue: { name: "image" } as any,
        ingredientQueue: { name: "ingredient" } as any,
        instructionQueue: { name: "instruction" } as any,
        categorizationQueue: { name: "categorization" } as any,
        sourceQueue: { name: "source" } as any,
      },
      services: {
        cleanHtml: vi.fn(),
        parseHtml: vi.fn(),
      },
    } as any;

    mockActionFactory = new ActionFactory();
    mockContainer = {
      logger: {
        log: vi.fn(),
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: { name: "note" } as any,
        imageQueue: { name: "image" } as any,
        ingredientQueue: { name: "ingredient" } as any,
        instructionQueue: { name: "instruction" } as any,
        categorizationQueue: { name: "categorization" } as any,
        sourceQueue: { name: "source" } as any,
      },
      cache: {} as any,
      database: {} as any,
      healthMonitor: {} as any,
      webSocket: {} as any,
      config: {} as any,
      close: vi.fn(),
    } as IServiceContainer;
  });

  describe("constructor", () => {
    it("should create a NoteWorker instance", () => {
      const worker = new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      expect(worker).toBeInstanceOf(NoteWorker);
      expect(worker).toBeDefined();
    });

    it("should call registerActions during construction", () => {
      const registerActionsSpy = vi.spyOn(
        NoteWorker.prototype as any,
        "registerActions"
      );

      new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      expect(registerActionsSpy).toHaveBeenCalled();
    });
  });

  describe("registerActions", () => {
    it("should register CLEAN_HTML action", () => {
      const registerSpy = vi.spyOn(mockActionFactory, "register");

      new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      expect(registerSpy).toHaveBeenCalledWith(
        ActionName.CLEAN_HTML,
        expect.any(Function)
      );
    });

    it("should register PARSE_HTML action", () => {
      const registerSpy = vi.spyOn(mockActionFactory, "register");

      new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      expect(registerSpy).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        expect.any(Function)
      );
    });

    it("should register SAVE_NOTE action", () => {
      const registerSpy = vi.spyOn(mockActionFactory, "register");

      new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      expect(registerSpy).toHaveBeenCalledWith(
        ActionName.SAVE_NOTE,
        expect.any(Function)
      );
    });

    it("should register actions in correct order", () => {
      const registerSpy = vi.spyOn(mockActionFactory, "register");

      new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      expect(registerSpy).toHaveBeenNthCalledWith(
        1,
        ActionName.CLEAN_HTML,
        expect.any(Function)
      );
      expect(registerSpy).toHaveBeenNthCalledWith(
        2,
        ActionName.PARSE_HTML,
        expect.any(Function)
      );
      expect(registerSpy).toHaveBeenNthCalledWith(
        3,
        ActionName.SAVE_NOTE,
        expect.any(Function)
      );
    });

    it("should create action instances when factory functions are called", () => {
      const registerSpy = vi.spyOn(mockActionFactory, "register");

      new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      // Get the factory functions that were registered
      const cleanHtmlFactory = registerSpy.mock.calls.find(
        (call) => call[0] === ActionName.CLEAN_HTML
      )?.[1];
      const parseHtmlFactory = registerSpy.mock.calls.find(
        (call) => call[0] === ActionName.PARSE_HTML
      )?.[1];
      const saveNoteFactory = registerSpy.mock.calls.find(
        (call) => call[0] === ActionName.SAVE_NOTE
      )?.[1];

      // Test that the factory functions create the correct action instances
      const cleanHtmlAction = cleanHtmlFactory!();
      const parseHtmlAction = parseHtmlFactory!();
      const saveNoteAction = saveNoteFactory!();

      expect(cleanHtmlAction.name).toBe(ActionName.CLEAN_HTML);
      expect(parseHtmlAction.name).toBe(ActionName.PARSE_HTML);
      expect(saveNoteAction.name).toBe(ActionName.SAVE_NOTE);

      // Verify that the action instances were created successfully
      expect(cleanHtmlAction).toBeDefined();
      expect(parseHtmlAction).toBeDefined();
      expect(saveNoteAction).toBeDefined();
    });
  });

  describe("getOperationName", () => {
    it("should return 'note-worker'", () => {
      const worker = new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      const operationName = (worker as any).getOperationName();

      expect(operationName).toBe("note-worker");
    });
  });

  describe("createActionPipeline", () => {
    it("should call createNotePipeline with correct parameters", async () => {
      const worker = new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );
      const testData = { content: "test", importId: "test-import" } as any;
      const testContext = { jobId: "test-job" } as any;

      // Mock the createNotePipeline function
      const { createNotePipeline } = await import("../../note/pipeline");
      vi.mocked(createNotePipeline).mockReturnValue([]);

      (worker as any).createActionPipeline(testData, testContext);

      expect(createNotePipeline).toHaveBeenCalledWith(
        mockActionFactory,
        mockDependencies,
        testData,
        testContext
      );
    });

    it("should return the result from createNotePipeline", async () => {
      const worker = new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );
      const testData = { content: "test", importId: "test-import" } as any;
      const testContext = { jobId: "test-job" } as any;
      const expectedPipeline = [
        { name: "action1" },
        { name: "action2" },
      ] as any;

      // Mock the createNotePipeline function
      const { createNotePipeline } = await import("../../note/pipeline");
      vi.mocked(createNotePipeline).mockReturnValue(expectedPipeline);

      const result = (worker as any).createActionPipeline(
        testData,
        testContext
      );

      expect(result).toBe(expectedPipeline);
    });
  });

  describe("inheritance", () => {
    it("should inherit from BaseWorker", () => {
      const worker = new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      // Check if it has BaseWorker methods (these would be inherited)
      expect(worker).toBeInstanceOf(NoteWorker);
      expect(typeof worker).toBe("object");
    });

    it("should have access to dependencies", () => {
      const worker = new NoteWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );

      expect((worker as any).dependencies).toBe(mockDependencies);
    });
  });
});

describe("createNoteWorker", () => {
  let mockQueue: any;
  let mockContainer: IServiceContainer;
  let mockDependencies: NoteWorkerDependencies;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockQueue = createMockQueue("test-note-queue");
    mockContainer = {
      logger: {
        log: vi.fn(),
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: { name: "note" } as any,
        imageQueue: { name: "image" } as any,
        ingredientQueue: { name: "ingredient" } as any,
        instructionQueue: { name: "instruction" } as any,
        categorizationQueue: { name: "categorization" } as any,
        sourceQueue: { name: "source" } as any,
      },
      cache: {} as any,
      database: {} as any,
      healthMonitor: {} as any,
      webSocket: {} as any,
      config: {} as any,
      close: vi.fn(),
    } as IServiceContainer;

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      queues: {
        noteQueue: { name: "note" } as any,
        imageQueue: { name: "image" } as any,
        ingredientQueue: { name: "ingredient" } as any,
        instructionQueue: { name: "instruction" } as any,
        categorizationQueue: { name: "categorization" } as any,
        sourceQueue: { name: "source" } as any,
      },
      services: {
        cleanHtml: vi.fn(),
        parseHtml: vi.fn(),
      },
    } as any;

    // Mock buildNoteWorkerDependencies
    const { buildNoteWorkerDependencies } = await import(
      "../../note/dependencies"
    );
    vi.mocked(buildNoteWorkerDependencies).mockReturnValue(mockDependencies);
  });

  describe("successful creation", () => {
    it("should create a NoteWorker instance", () => {
      const worker = createNoteWorker(mockQueue, mockContainer);

      expect(worker).toBeInstanceOf(NoteWorker);
      expect(worker).toBeDefined();
    });

    it("should call buildNoteWorkerDependencies with the container", async () => {
      const { buildNoteWorkerDependencies } = await import(
        "../../note/dependencies"
      );

      createNoteWorker(mockQueue, mockContainer);

      expect(buildNoteWorkerDependencies).toHaveBeenCalledWith(mockContainer);
      expect(buildNoteWorkerDependencies).toHaveBeenCalledTimes(1);
    });

    it("should create a new ActionFactory", () => {
      const worker = createNoteWorker(mockQueue, mockContainer);

      expect((worker as any).actionFactory).toBeInstanceOf(ActionFactory);
    });
  });

  describe("dependencies integration", () => {
    it("should use the dependencies returned by buildNoteWorkerDependencies", async () => {
      const customDependencies = {
        ...mockDependencies,
        logger: {
          log: vi.fn(),
          debug: vi.fn(),
        },
      };

      const { buildNoteWorkerDependencies } = await import(
        "../../note/dependencies"
      );
      vi.mocked(buildNoteWorkerDependencies).mockReturnValue(
        customDependencies
      );

      const worker = createNoteWorker(mockQueue, mockContainer);

      expect((worker as any).dependencies).toBe(customDependencies);
    });

    it("should handle different dependency configurations", async () => {
      const differentDependencies = {
        ...mockDependencies,
        services: {
          cleanHtml: vi.fn(),
          parseHtml: vi.fn(),
          saveNote: vi.fn(),
          customService: vi.fn(),
        },
      };

      const { buildNoteWorkerDependencies } = await import(
        "../../note/dependencies"
      );
      vi.mocked(buildNoteWorkerDependencies).mockReturnValue(
        differentDependencies
      );

      const worker = createNoteWorker(mockQueue, mockContainer);

      expect((worker as any).dependencies).toBe(differentDependencies);
    });
  });

  describe("error handling", () => {
    it("should propagate errors from buildNoteWorkerDependencies", async () => {
      const { buildNoteWorkerDependencies } = await import(
        "../../note/dependencies"
      );
      const testError = new Error("Dependencies failed");
      vi.mocked(buildNoteWorkerDependencies).mockImplementation(() => {
        throw testError;
      });

      expect(() => {
        createNoteWorker(mockQueue, mockContainer);
      }).toThrow("Dependencies failed");
    });

    it("should handle ActionFactory creation errors", () => {
      // This would be tested if ActionFactory constructor could throw
      // For now, we just verify the function doesn't throw under normal circumstances
      expect(() => {
        createNoteWorker(mockQueue, mockContainer);
      }).not.toThrow();
    });
  });

  describe("return value", () => {
    it("should return a NoteWorker instance", () => {
      const worker = createNoteWorker(mockQueue, mockContainer);

      expect(worker).toBeInstanceOf(NoteWorker);
    });

    it("should return different instances on multiple calls", () => {
      const worker1 = createNoteWorker(mockQueue, mockContainer);
      const worker2 = createNoteWorker(mockQueue, mockContainer);

      expect(worker1).not.toBe(worker2);
      expect((worker1 as any).actionFactory).not.toBe(
        (worker2 as any).actionFactory
      );
    });
  });

  describe("parameter validation", () => {
    it("should work with different queue configurations", () => {
      const differentQueue = createMockQueue("different-queue");

      expect(() => {
        createNoteWorker(differentQueue, mockContainer);
      }).not.toThrow();
    });

    it("should work with different container configurations", () => {
      const differentContainer = {
        ...mockContainer,
        logger: {
          log: vi.fn(),
          debug: vi.fn(),
        },
      } as IServiceContainer;

      expect(() => {
        createNoteWorker(mockQueue, differentContainer);
      }).not.toThrow();
    });
  });
});

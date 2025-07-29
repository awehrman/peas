/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockActionContext,
  createMockNoteData,
} from "../../../test-utils/helpers";
import { ActionName } from "../../../types";
import type { NoteWorkerDependencies } from "../../../types/notes";
import type { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";
import { createNotePipeline } from "../../note/pipeline";

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe("createNotePipeline", () => {
  let mockActionFactory: ActionFactory<any, any, any>;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    mockActionFactory = {
      create: vi.fn() as any,
    } as any;

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

    mockContext = createMockActionContext();
  });

  describe("basic pipeline creation", () => {
    it("should create a pipeline with clean and parse actions", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toBeDefined();
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline).toHaveLength(3);
      expect(pipeline[0]).toBe(mockCleanAction);
      expect(pipeline[1]).toBe(mockParseAction);
      expect(pipeline[2]).toBe(mockSaveAction);
    });

    it("should call actionFactory.create with correct parameters", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        1,
        ActionName.CLEAN_HTML,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        2,
        ActionName.PARSE_HTML,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        3,
        ActionName.SAVE_NOTE,
        mockDependencies
      );
    });

    it("should return actions in correct order", () => {
      const mockCleanAction = { name: "clean-html", order: 1 } as any;
      const mockParseAction = { name: "parse-html", order: 2 } as any;
      const mockSaveAction = { name: "save-note", order: 3 } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline[0]).toBe(mockCleanAction);
      expect(pipeline[1]).toBe(mockParseAction);
      expect(pipeline[2]).toBe(mockSaveAction);
    });
  });

  describe("conditional follow-up tasks", () => {
    it("should not add follow-up tasks when skipFollowupTasks is true", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData({
        options: {
          skipFollowupTasks: true,
        },
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(3);
      // The console.log should NOT be called when skipFollowupTasks is true
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should add follow-up tasks when skipFollowupTasks is false", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData({
        options: {
          skipFollowupTasks: false,
        },
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(3);
      // The console.log should be called when skipFollowupTasks is false
      expect(console.log).toHaveBeenCalledWith(
        "[PIPELINE] Follow-up tasks would be scheduled here"
      );
    });

    it("should add follow-up tasks when options is undefined", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData({
        options: undefined,
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(3);
      // The console.log should be called when options is undefined
      expect(console.log).toHaveBeenCalledWith(
        "[PIPELINE] Follow-up tasks would be scheduled here"
      );
    });

    it("should add follow-up tasks when options.skipFollowupTasks is undefined", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData({
        options: {
          skipFollowupTasks: undefined,
        },
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(3);
      // The console.log should be called when skipFollowupTasks is undefined
      expect(console.log).toHaveBeenCalledWith(
        "[PIPELINE] Follow-up tasks would be scheduled here"
      );
    });
  });

  describe("data handling", () => {
    it("should handle data with minimal properties", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData({
        content: "<html><body>Minimal content</body></html>",
        importId: "minimal-import",
        source: {
          filename: "minimal.html",
          url: "https://example.com/minimal",
        },
        options: {},
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(3);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
    });

    it("should handle data with complex options", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData({
        content: "<html><body>Complex content</body></html>",
        importId: "complex-import",
        source: {
          filename: "complex.html",
          url: "https://example.com/complex",
        },
        options: {
          skipFollowupTasks: true,
          customOption: "value",
          nestedOption: {
            key: "value",
          },
        },
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(3);
      // The console.log should NOT be called when skipFollowupTasks is true
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("context handling", () => {
    it("should accept and use context parameter", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const customContext = createMockActionContext({
        jobId: "custom-job-id",
        operation: "custom-operation",
        workerName: "custom-worker",
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        customContext
      );

      expect(pipeline).toHaveLength(3);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
    });

    it("should work with minimal context", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const minimalContext = createMockActionContext();

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        minimalContext
      );

      expect(pipeline).toHaveLength(3);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
    });
  });

  describe("action factory integration", () => {
    it("should use the provided action factory", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CLEAN_HTML,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SAVE_NOTE,
        mockDependencies
      );
    });

    it("should handle action factory that returns different action types", () => {
      const mockCleanAction = { name: "clean-html", type: "clean" } as any;
      const mockParseAction = { name: "parse-html", type: "parse" } as any;
      const mockSaveAction = { name: "save-note", type: "save" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline[0]).toBe(mockCleanAction);
      expect(pipeline[1]).toBe(mockParseAction);
      expect(pipeline[2]).toBe(mockSaveAction);
      expect((pipeline[0] as any).type).toBe("clean");
      expect((pipeline[1] as any).type).toBe("parse");
      expect((pipeline[2] as any).type).toBe("save");
    });
  });

  describe("dependencies handling", () => {
    it("should pass dependencies to action factory", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CLEAN_HTML,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SAVE_NOTE,
        mockDependencies
      );
    });

    it("should work with different dependency configurations", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const differentDependencies = {
        ...mockDependencies,
        logger: {
          log: vi.fn(),
          debug: vi.fn(),
        },
        services: {
          cleanHtml: vi.fn(),
          parseHtml: vi.fn(),
          saveNote: vi.fn(),
          customService: vi.fn(),
        },
      };

      const testData = createMockNoteData();
      createNotePipeline(
        mockActionFactory,
        differentDependencies,
        testData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CLEAN_HTML,
        differentDependencies
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        differentDependencies
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SAVE_NOTE,
        differentDependencies
      );
    });
  });

  describe("return type", () => {
    it("should return array of WorkerAction", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline).toHaveLength(3);
      expect(pipeline[0]).toBeDefined();
      expect(pipeline[1]).toBeDefined();
      expect(pipeline[2]).toBeDefined();
    });

    it("should return immutable array", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      // Should be able to access array methods
      expect(pipeline.length).toBe(3);
      expect(pipeline[0]).toBe(mockCleanAction);
      expect(pipeline[1]).toBe(mockParseAction);
      expect(pipeline[2]).toBe(mockSaveAction);
    });
  });

  describe("edge cases", () => {
    it("should handle empty data object", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const emptyData = {} as any;
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        emptyData,
        mockContext
      );

      expect(pipeline).toHaveLength(3);
      // The console.log should be called when options is undefined
      expect(console.log).toHaveBeenCalledWith(
        "[PIPELINE] Follow-up tasks would be scheduled here"
      );
    });

    it("should handle null context", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        null as any
      );

      expect(pipeline).toHaveLength(3);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
    });

    it("should handle undefined context", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        undefined as any
      );

      expect(pipeline).toHaveLength(3);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
    });
  });
});

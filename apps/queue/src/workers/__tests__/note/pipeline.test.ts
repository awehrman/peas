/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import type { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";
import { createNotePipeline } from "../../note/pipeline";

describe("createNotePipeline", () => {
  let mockActionFactory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock action factory
    mockActionFactory = {
      create: vi.fn(),
      register: vi.fn(),
      registerWithWrappers: vi.fn(),
    } as any;

    // Create mock dependencies
    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
    } as any;

    // Create mock context
    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "notes",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  // Helper function to create mock note data
  function createMockNoteData(
    overrides: Partial<NotePipelineData> = {}
  ): NotePipelineData {
    return {
      content: "Test content",
      importId: "test-import-id",
      ...overrides,
    };
  }

  describe("basic pipeline creation", () => {
    it("should create a pipeline with clean and parse actions", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toBeDefined();
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline).toHaveLength(7);
      expect(pipeline[0]).toBe(mockCleanAction);
      expect(pipeline[1]).toBe(mockParseAction);
      expect(pipeline[2]).toBe(mockSaveAction);
      expect(pipeline[3]).toBe(mockScheduleAction);
    });

    it("should call actionFactory.create with correct parameters", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction);

      const testData = createMockNoteData();
      createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(7);
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
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        4,
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        5,
        ActionName.CHECK_DUPLICATES,
        mockDependencies
      );
    });

    it("should return actions in correct order", () => {
      const mockCleanAction = { name: "clean-html", order: 1 } as any;
      const mockParseAction = { name: "parse-html", order: 2 } as any;
      const mockSaveAction = { name: "save-note", order: 3 } as any;
      const mockScheduleAction = {
        name: "schedule-all-followup-tasks",
        order: 4,
      } as any;
      const mockCheckDuplicatesAction = {
        name: "check-duplicates",
        order: 5,
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction);

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
      expect(pipeline[3]).toBe(mockScheduleAction);
      expect(pipeline[4]).toBe(mockCheckDuplicatesAction);
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

      expect(pipeline).toHaveLength(5);
      // When skipFollowupTasks is true, the SCHEDULE_ALL_FOLLOWUP_TASKS action should not be added
      expect(mockActionFactory.create).not.toHaveBeenCalledWith(
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        mockDependencies
      );
    });

    it("should add follow-up tasks when skipFollowupTasks is false", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction);

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

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        mockDependencies
      );
    });

    it("should add follow-up tasks when options is undefined", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData({
        options: undefined,
      });

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        mockDependencies
      );
    });

    it("should add follow-up tasks when options.skipFollowupTasks is undefined", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

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

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        mockDependencies
      );
    });
  });

  describe("data handling", () => {
    it("should handle data with minimal properties", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(7);
    });
  });

  describe("context handling", () => {
    it("should accept and use context parameter", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData();
      const customContext: ActionContext = {
        jobId: "custom-job-id",
        retryCount: 0,
        queueName: "notes",
        operation: "custom-operation",
        startTime: Date.now(),
        workerName: "custom-worker",
        attemptNumber: 1,
      };

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        customContext
      );

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(7);
    });

    it("should work with minimal context", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData();
      const minimalContext: ActionContext = {
        jobId: "minimal-job-id",
        retryCount: 0,
        queueName: "notes",
        operation: "minimal-operation",
        startTime: Date.now(),
        workerName: "minimal-worker",
        attemptNumber: 1,
      };

      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        minimalContext
      );

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(7);
    });
  });

  describe("return type", () => {
    it("should return array of WorkerAction", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline).toHaveLength(7);
      expect(pipeline[0]).toBeDefined();
      expect(pipeline[1]).toBeDefined();
      expect(pipeline[2]).toBeDefined();
      expect(pipeline[3]).toBeDefined();
      expect(pipeline[4]).toBeDefined();
      expect(pipeline[5]).toBeDefined();
      expect(pipeline[6]).toBeDefined();
    });

    it("should return immutable array", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      // Should be able to access array methods
      expect(pipeline.length).toBe(7);
      expect(pipeline[0]).toBe(mockCleanAction);
      expect(pipeline[1]).toBe(mockParseAction);
      expect(pipeline[2]).toBe(mockSaveAction);
      expect(pipeline[3]).toBe(mockScheduleAction);
      expect(pipeline[4]).toBe(mockCheckDuplicatesAction);
    });
  });

  describe("edge cases", () => {
    it("should handle empty data object", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = {} as NotePipelineData;
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        mockContext
      );

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        mockDependencies
      );
    });

    it("should handle null context", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        null as any
      );

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(7);
    });

    it("should handle undefined context", () => {
      const mockCleanAction = { name: "clean-html" } as any;
      const mockParseAction = { name: "parse-html" } as any;
      const mockSaveAction = { name: "save-note" } as any;
      const mockScheduleAction = { name: "schedule-all-followup-tasks" } as any;
      const mockCheckDuplicatesAction = { name: "check-duplicates" } as any;
      const mockWaitForCategorizationAction = {
        name: "wait-for-categorization",
      } as any;
      const mockMarkNoteWorkerCompletedAction = {
        name: "mark-note-worker-completed",
      } as any;

      (mockActionFactory.create as any)
        .mockReturnValueOnce(mockCleanAction)
        .mockReturnValueOnce(mockParseAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockScheduleAction)
        .mockReturnValueOnce(mockCheckDuplicatesAction)
        .mockReturnValueOnce(mockWaitForCategorizationAction)
        .mockReturnValueOnce(mockMarkNoteWorkerCompletedAction);

      const testData = createMockNoteData();
      const pipeline = createNotePipeline(
        mockActionFactory,
        mockDependencies,
        testData,
        undefined as any
      );

      expect(pipeline).toHaveLength(7);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(7);
    });
  });
});

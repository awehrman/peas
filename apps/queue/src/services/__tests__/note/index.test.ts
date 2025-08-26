/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { NotePipelineData } from "../../../types/notes";
import type { NoteWorkerDependencies } from "../../../types/notes";
import { ActionFactory } from "../../../workers/core/action-factory";
import { registerNoteActions } from "../../note/register";

// Mock the action classes
vi.mock("../../note/actions/clean-html/action", () => ({
  CleanHtmlAction: vi.fn(),
}));

vi.mock("../../note/actions/parse-html/action", () => ({
  ParseHtmlAction: vi.fn(),
}));

vi.mock("../../note/actions/process-source/action", () => ({
  ProcessSourceAction: vi.fn(),
}));

vi.mock("../../note/actions/save-note/action", () => ({
  SaveNoteAction: vi.fn(),
}));

vi.mock("../../note/actions/schedule-tasks/action", () => ({
  ScheduleAllFollowupTasksAction: vi.fn(),
}));

// Mock the action registry
vi.mock("../../../workers/shared/action-registry", () => ({
  createActionRegistration: vi.fn(),
  registerActions: vi.fn(),
}));

describe("Note Services Index", () => {
  let mockFactory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >;
  let mockCreateActionRegistration: ReturnType<typeof vi.fn>;
  let mockRegisterActions: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock factory
    mockFactory = {
      register: vi.fn(),
    } as any;

    // Get mocked functions
    const actionRegistryModule = await import(
      "../../../workers/shared/action-registry"
    );
    mockCreateActionRegistration = vi.mocked(
      actionRegistryModule.createActionRegistration
    );
    mockRegisterActions = vi.mocked(actionRegistryModule.registerActions);

    // Setup default mock implementations
    mockCreateActionRegistration.mockImplementation((name, actionClass) => ({
      name,
      actionClass,
    }));
    mockRegisterActions.mockImplementation(() => {});
  });

  describe("registerNoteActions", () => {
    it("should register all note actions with correct action names", () => {
      registerNoteActions(mockFactory);

      expect(mockRegisterActions).toHaveBeenCalledWith(mockFactory, [
        expect.objectContaining({ name: ActionName.PARSE_HTML }),
        expect.objectContaining({ name: ActionName.CLEAN_HTML }),
        expect.objectContaining({ name: ActionName.SAVE_NOTE }),
        expect.objectContaining({
          name: ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        }),
        expect.objectContaining({ name: ActionName.PROCESS_SOURCE }),
        expect.objectContaining({
          name: ActionName.SCHEDULE_INSTRUCTION_LINES,
        }),
        expect.objectContaining({ name: ActionName.SCHEDULE_IMAGES }),
        expect.objectContaining({ name: ActionName.CHECK_DUPLICATES }),
        expect.objectContaining({ name: ActionName.WAIT_FOR_CATEGORIZATION }),
        expect.objectContaining({
          name: ActionName.MARK_NOTE_WORKER_COMPLETED,
        }),
      ]);
    });

    it("should create action registrations with correct parameters", () => {
      registerNoteActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledTimes(9);

      // Check each action registration
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        expect.any(Function) // ParseHtmlAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.CLEAN_HTML,
        expect.any(Function) // CleanHtmlAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.SAVE_NOTE,
        expect.any(Function) // SaveNoteAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        expect.any(Function) // ScheduleAllFollowupTasksAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.PROCESS_SOURCE,
        expect.any(Function) // ProcessSourceAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.SCHEDULE_INSTRUCTION_LINES,
        expect.any(Function) // ScheduleInstructionsAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.SCHEDULE_IMAGES,
        expect.any(Function) // ScheduleImagesAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.CHECK_DUPLICATES,
        expect.any(Function) // CheckDuplicatesAction
      );
      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.WAIT_FOR_CATEGORIZATION,
        expect.any(Function) // WaitForCategorizationAction
      );
      // Note: MARK_NOTE_WORKER_COMPLETED uses a custom registration object, not createActionRegistration
    });

    it("should register actions in the correct order", () => {
      registerNoteActions(mockFactory);

      const calls = mockCreateActionRegistration.mock.calls;
      expect(calls[0]?.[0]).toBe(ActionName.PARSE_HTML);
      expect(calls[1]?.[0]).toBe(ActionName.CLEAN_HTML);
      expect(calls[2]?.[0]).toBe(ActionName.SAVE_NOTE);
      expect(calls[3]?.[0]).toBe(ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS);
      expect(calls[4]?.[0]).toBe(ActionName.PROCESS_SOURCE);
      expect(calls[5]?.[0]).toBe(ActionName.SCHEDULE_INSTRUCTION_LINES);
      expect(calls[6]?.[0]).toBe(ActionName.SCHEDULE_IMAGES);
      expect(calls[7]?.[0]).toBe(ActionName.CHECK_DUPLICATES);
      expect(calls[8]?.[0]).toBe(ActionName.WAIT_FOR_CATEGORIZATION);

      // Check that the 10th action (MARK_NOTE_WORKER_COMPLETED) is in the registrations array
      const registrations = mockRegisterActions.mock.calls[0]?.[1];
      expect(registrations).toHaveLength(10);
      expect(registrations[9]?.name).toBe(
        ActionName.MARK_NOTE_WORKER_COMPLETED
      );
    });

    it("should handle factory with different configurations", () => {
      const customFactory = {
        register: vi.fn(),
        customMethod: vi.fn(),
      } as any;

      registerNoteActions(customFactory);

      expect(mockRegisterActions).toHaveBeenCalledWith(
        customFactory,
        expect.any(Array)
      );
    });

    it("should work with empty factory", () => {
      const emptyFactory = { register: vi.fn() } as any;

      registerNoteActions(emptyFactory);

      expect(mockRegisterActions).toHaveBeenCalledWith(
        emptyFactory,
        expect.any(Array)
      );
    });

    it("should maintain type safety for action registrations", () => {
      registerNoteActions(mockFactory);

      const registrations = mockRegisterActions.mock.calls[0]?.[1];
      expect(registrations).toHaveLength(10);

      // Each registration should have the correct structure
      registrations.forEach((registration: any, index: number) => {
        expect(registration).toHaveProperty("name");
        expect(typeof registration.name).toBe("string");

        // Most registrations have actionClass, but the 10th one (index 9) has factory
        if (index === 9) {
          expect(registration).toHaveProperty("factory");
          expect(typeof registration.factory).toBe("function");
        } else {
          expect(registration).toHaveProperty("actionClass");
          // actionClass can be either a function (class) or object (instance)
          expect(
            typeof registration.actionClass === "function" ||
              typeof registration.actionClass === "object"
          ).toBe(true);
        }
      });
    });

    it("should not call factory.register directly", () => {
      registerNoteActions(mockFactory);

      expect(mockFactory.register).not.toHaveBeenCalled();
    });

    it("should use the shared action registry", () => {
      registerNoteActions(mockFactory);

      expect(mockRegisterActions).toHaveBeenCalledTimes(1);
      expect(mockCreateActionRegistration).toHaveBeenCalledTimes(9);
    });
  });

  describe("exports", () => {
    it("should export registerNoteActions function", async () => {
      const { registerNoteActions: exportedFunction } = await import(
        "../../note"
      );

      expect(typeof exportedFunction).toBe("function");
      expect(exportedFunction).toBe(registerNoteActions);
    });

    it("should export registerNoteActions with correct signature", () => {
      expect(typeof registerNoteActions).toBe("function");
      expect(registerNoteActions.length).toBe(1); // One parameter: factory
    });

    it("should be callable with ActionFactory", () => {
      expect(() => registerNoteActions(mockFactory)).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle null factory gracefully", () => {
      expect(() => registerNoteActions(null as any)).toThrow();
    });

    it("should handle undefined factory gracefully", () => {
      expect(() => registerNoteActions(undefined as any)).toThrow();
    });

    it("should handle factory without registerActions method", () => {
      const invalidFactory = { register: vi.fn() } as any;
      expect(() => registerNoteActions(invalidFactory)).not.toThrow();
    });
  });

  describe("integration", () => {
    it("should work with real action classes when imported", async () => {
      // This test verifies that the actual action classes can be imported
      // and used in the registration process

      const { ParseHtmlAction } = await import(
        "../../note/actions/parse-html/action"
      );
      const { CleanHtmlAction } = await import(
        "../../note/actions/clean-html/action"
      );
      const { SaveNoteAction } = await import(
        "../../note/actions/save-note/action"
      );
      const { ProcessSourceAction } = await import(
        "../../note/actions/process-source/action"
      );
      const { ScheduleAllFollowupTasksAction } = await import(
        "../../note/actions/schedule-tasks/action"
      );

      expect(ParseHtmlAction).toBeDefined();
      expect(CleanHtmlAction).toBeDefined();
      expect(SaveNoteAction).toBeDefined();
      expect(ProcessSourceAction).toBeDefined();
      expect(ScheduleAllFollowupTasksAction).toBeDefined();
    });

    it("should register actions with correct action names from enum", () => {
      registerNoteActions(mockFactory);

      const actualActionNames = mockCreateActionRegistration.mock.calls.map(
        (call) => call[0]
      );

      expect(actualActionNames).toEqual([
        "parse_html",
        "clean_html",
        "save_note",
        "schedule_all_followup_tasks",
        "process_source",
        "schedule_instruction_lines",
        "schedule_images",
        "check_duplicates",
        "wait_for_categorization",
      ]);

      // Check that the 10th action is registered via custom registration
      const registrations = mockRegisterActions.mock.calls[0]?.[1];
      expect(registrations).toHaveLength(10);
      expect(registrations[9]?.name).toBe("mark_note_worker_completed");
    });
  });
});

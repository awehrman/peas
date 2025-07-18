import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionFactory } from "../../../core/action-factory";
import { registerNoteActions } from "../index";
import { SaveNoteAction } from "../save-note";
import { ParseHtmlAction } from "../parse-html";
import { CleanHtmlAction } from "../clean-html";
import { ScheduleSourceAction } from "../schedule-source";
import { ScheduleImagesAction } from "../schedule-images";
import { ScheduleIngredientsAction } from "../schedule-ingredients";
import { ScheduleInstructionsAction } from "../schedule-instructions";
import { ScheduleAllFollowupTasksAction } from "../schedule-all-followup-tasks";

describe("Note Actions Index", () => {
  let factory: ActionFactory;

  beforeEach(() => {
    factory = new ActionFactory();
  });

  describe("registerNoteActions", () => {
    it("should register all note actions", () => {
      registerNoteActions(factory);

      expect(factory.isRegistered("parse_html")).toBe(true);
      expect(factory.isRegistered("clean_html")).toBe(true);
      expect(factory.isRegistered("save_note")).toBe(true);
      expect(factory.isRegistered("schedule_images")).toBe(true);
      expect(factory.isRegistered("schedule_source")).toBe(true);
      expect(factory.isRegistered("schedule_ingredients")).toBe(true);
      expect(factory.isRegistered("schedule_instructions")).toBe(true);
      expect(factory.isRegistered("schedule_all_followup_tasks")).toBe(true);
    });

    it("should create correct action instances", () => {
      registerNoteActions(factory);

      const parseHtmlAction = factory.create("parse_html");
      const cleanHtmlAction = factory.create("clean_html");
      const saveNoteAction = factory.create("save_note");
      const scheduleImagesAction = factory.create("schedule_images");
      const scheduleSourceAction = factory.create("schedule_source");
      const scheduleIngredientsAction = factory.create("schedule_ingredients");
      const scheduleInstructionsAction = factory.create(
        "schedule_instructions"
      );
      const scheduleAllFollowupTasksAction = factory.create(
        "schedule_all_followup_tasks"
      );

      expect(parseHtmlAction).toBeInstanceOf(ParseHtmlAction);
      expect(cleanHtmlAction).toBeInstanceOf(CleanHtmlAction);
      expect(saveNoteAction).toBeInstanceOf(SaveNoteAction);
      expect(scheduleImagesAction).toBeInstanceOf(ScheduleImagesAction);
      expect(scheduleSourceAction).toBeInstanceOf(ScheduleSourceAction);
      expect(scheduleIngredientsAction).toBeInstanceOf(
        ScheduleIngredientsAction
      );
      expect(scheduleInstructionsAction).toBeInstanceOf(
        ScheduleInstructionsAction
      );
      expect(scheduleAllFollowupTasksAction).toBeInstanceOf(
        ScheduleAllFollowupTasksAction
      );
    });

    it("should create new instances for each factory call", () => {
      registerNoteActions(factory);

      const action1 = factory.create("parse_html");
      const action2 = factory.create("parse_html");

      expect(action1).not.toBe(action2);
      expect(action1).toBeInstanceOf(ParseHtmlAction);
      expect(action2).toBeInstanceOf(ParseHtmlAction);
    });

    it("should handle multiple registrations gracefully", () => {
      // Register actions multiple times
      registerNoteActions(factory);
      registerNoteActions(factory);

      // Should still work correctly
      const action = factory.create("parse_html");
      expect(action).toBeInstanceOf(ParseHtmlAction);
    });

    it("should register actions in the correct order", () => {
      const registerSpy = vi.spyOn(factory, "register");

      registerNoteActions(factory);

      expect(registerSpy).toHaveBeenCalledTimes(9);

      // Verify the order of registrations
      const calls = registerSpy.mock.calls;
      expect(calls[0]).toEqual(["parse_html", expect.any(Function)]);
      expect(calls[1]).toEqual(["clean_html", expect.any(Function)]);
      expect(calls[2]).toEqual(["save_note", expect.any(Function)]);
      expect(calls[3]).toEqual(["schedule_images", expect.any(Function)]);
      expect(calls[4]).toEqual(["schedule_source", expect.any(Function)]);
      expect(calls[5]).toEqual(["schedule_ingredients", expect.any(Function)]);
      expect(calls[6]).toEqual(["schedule_instructions", expect.any(Function)]);
      expect(calls[7]).toEqual([
        "schedule_all_followup_tasks",
        expect.any(Function),
      ]);
      expect(calls[8]).toEqual(["note_completed_status", expect.any(Function)]);
    });

    it("should create actions with proper dependencies when needed", () => {
      registerNoteActions(factory);

      // Test that actions can be created with dependencies
      const mockDeps = {
        logger: { log: vi.fn() },
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        ErrorHandler: {
          withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
        },
      };

      const action = factory.create("parse_html", mockDeps);
      expect(action).toBeInstanceOf(ParseHtmlAction);
    });

    it("should export all required modules", () => {
      // This test ensures that all the barrel exports are working correctly
      // The imports at the top of the test file should not fail
      expect(SaveNoteAction).toBeDefined();
      expect(ParseHtmlAction).toBeDefined();
      expect(ScheduleSourceAction).toBeDefined();
      expect(ScheduleImagesAction).toBeDefined();
      expect(ScheduleIngredientsAction).toBeDefined();
      expect(ScheduleInstructionsAction).toBeDefined();
      expect(ScheduleAllFollowupTasksAction).toBeDefined();
      expect(registerNoteActions).toBeDefined();
    });
  });
});

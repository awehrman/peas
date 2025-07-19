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
      const factory = new ActionFactory();
      const registerSpy = vi.spyOn(factory, "register");

      registerNoteActions(factory);

      expect(registerSpy).toHaveBeenCalledTimes(8);

      // Verify the order of registrations
      const calls = registerSpy.mock.calls;
      expect(calls[0]![0]).toBe("parse_html");
      expect(calls[1]![0]).toBe("clean_html");
      expect(calls[2]![0]).toBe("save_note");
      expect(calls[3]![0]).toBe("schedule_images");
      expect(calls[4]![0]).toBe("schedule_source");
      expect(calls[5]![0]).toBe("schedule_ingredients");
      expect(calls[6]![0]).toBe("schedule_instructions");
      expect(calls[7]![0]).toBe("schedule_all_followup_tasks");
    });

    it("should create actions with proper dependencies when needed", () => {
      const factory = new ActionFactory();
      registerNoteActions(factory);

      // Test that we can create an action that requires dependencies
      const mockDeps = {
        logger: { log: vi.fn() },
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        database: {
          createNote: vi.fn().mockResolvedValue({ id: "test-note" }),
        },
      };

      const action = factory.create("save_note", mockDeps);
      expect(action).toBeInstanceOf(SaveNoteAction);
    });

    it("should export all required modules", () => {
      // This test ensures that all the exported modules are available
      expect(typeof registerNoteActions).toBe("function");
    });
  });
});

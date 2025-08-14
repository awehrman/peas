import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InitializeCompletionTrackingAction,
  MarkNoteAsFailedAction,
  MarkWorkerCompletedAction,
  TrackCompletionAction,
  createMarkImageWorkerCompletedAction,
  createMarkIngredientWorkerCompletedAction,
  createMarkInstructionWorkerCompletedAction,
  createMarkNoteWorkerCompletedAction,
} from "../../../../note/actions/track-completion";

describe("Track Completion Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("convenience functions", () => {
    it("should create mark note worker completed action", () => {
      const action = createMarkNoteWorkerCompletedAction();
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });

    it("should create mark instruction worker completed action", () => {
      const action = createMarkInstructionWorkerCompletedAction();
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });

    it("should create mark ingredient worker completed action", () => {
      const action = createMarkIngredientWorkerCompletedAction();
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });

    it("should create mark image worker completed action", () => {
      const action = createMarkImageWorkerCompletedAction();
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });
  });

  describe("action classes", () => {
    it("should export MarkWorkerCompletedAction", () => {
      expect(MarkWorkerCompletedAction).toBeDefined();
      expect(typeof MarkWorkerCompletedAction).toBe("function");
    });

    it("should export MarkNoteAsFailedAction", () => {
      expect(MarkNoteAsFailedAction).toBeDefined();
      expect(typeof MarkNoteAsFailedAction).toBe("function");
    });

    it("should export InitializeCompletionTrackingAction", () => {
      expect(InitializeCompletionTrackingAction).toBeDefined();
      expect(typeof InitializeCompletionTrackingAction).toBe("function");
    });

    it("should export TrackCompletionAction", () => {
      expect(TrackCompletionAction).toBeDefined();
      expect(typeof TrackCompletionAction).toBe("function");
    });
  });

  describe("action instantiation", () => {
    it("should instantiate MarkWorkerCompletedAction with note type", () => {
      const action = new MarkWorkerCompletedAction("note");
      expect(action).toBeInstanceOf(MarkWorkerCompletedAction);
    });

    it("should instantiate MarkNoteAsFailedAction with error message", () => {
      const action = new MarkNoteAsFailedAction("Test error");
      expect(action).toBeInstanceOf(MarkNoteAsFailedAction);
    });

    it("should instantiate InitializeCompletionTrackingAction", () => {
      const action = new InitializeCompletionTrackingAction();
      expect(action).toBeInstanceOf(InitializeCompletionTrackingAction);
    });

    it("should instantiate TrackCompletionAction", () => {
      const action = new TrackCompletionAction();
      expect(action).toBeInstanceOf(TrackCompletionAction);
    });
  });
});

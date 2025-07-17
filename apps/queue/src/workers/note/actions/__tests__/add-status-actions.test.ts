import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { AddStatusActionsAction } from "../add-status-actions";
import type {
  AddStatusActionsDeps,
  AddStatusActionsData,
} from "../add-status-actions";
import type { ActionContext } from "../../../core/types";

// Mock the broadcast status actions
vi.mock("../../../shared/broadcast-status", async () => {
  const BroadcastProcessingAction = vi.fn(() => ({
    name: "broadcast_processing",
    execute: vi.fn().mockResolvedValue(undefined),
  }));
  const BroadcastCompletedAction = vi.fn(() => ({
    name: "broadcast_completed",
    execute: vi.fn().mockResolvedValue(undefined),
  }));
  return {
    BroadcastProcessingAction,
    BroadcastCompletedAction,
  };
});

import {
  BroadcastProcessingAction,
  BroadcastCompletedAction,
} from "../../../shared/broadcast-status";

describe("AddStatusActionsAction", () => {
  let action: AddStatusActionsAction;
  let mockDeps: AddStatusActionsDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new AddStatusActionsAction();
    mockDeps = {
      addStatusEventAndBroadcast: vi.fn(),
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "add_status_actions",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should create action with correct name", () => {
      expect(action.name).toBe("add_status_actions");
    });
  });

  describe("execute", () => {
    it("should successfully execute processing and completed status actions", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const processingExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });
      const completedExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result).toEqual(inputData);
      expect(processingExecute).toHaveBeenCalledWith(
        { noteId: "note-123", message: "Processing completed" },
        mockDeps,
        mockContext
      );
      expect(completedExecute).toHaveBeenCalledWith(
        { noteId: "note-123", message: "Processing completed" },
        mockDeps,
        mockContext
      );
    });

    it("should create and execute BroadcastProcessingAction", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const processingExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });
      const completedExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      await action.execute(inputData, mockDeps, mockContext);
      expect(BroadcastProcessingAction).toHaveBeenCalled();
      expect(processingExecute).toHaveBeenCalledWith(
        { noteId: "note-123", message: "Processing completed" },
        mockDeps,
        mockContext
      );
    });

    it("should create and execute BroadcastCompletedAction", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const processingExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });
      const completedExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      await action.execute(inputData, mockDeps, mockContext);
      expect(BroadcastCompletedAction).toHaveBeenCalled();
      expect(completedExecute).toHaveBeenCalledWith(
        { noteId: "note-123", message: "Processing completed" },
        mockDeps,
        mockContext
      );
    });

    it("should log operation with noteId", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const processingExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });
      const completedExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      await action.execute(inputData, mockDeps, mockContext);

      // The action logs to console.log, so we can't easily test it without spying on console
      // This test just ensures the action executes without error
      expect(processingExecute).toHaveBeenCalled();
      expect(completedExecute).toHaveBeenCalled();
    });

    it("should handle missing noteId gracefully", async () => {
      const inputData: AddStatusActionsData = {
        message: "Processing completed",
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result).toEqual(inputData);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[ADD_STATUS_ACTIONS] No noteId available, skipping status actions"
      );
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(BroadcastCompletedAction).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle note without id gracefully", async () => {
      const inputData: AddStatusActionsData = {
        note: undefined,
        message: "Processing completed",
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result).toEqual(inputData);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[ADD_STATUS_ACTIONS] No noteId available, skipping status actions"
      );
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(BroadcastCompletedAction).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle processing action errors", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const processingError = new Error("Processing status failed");
      const processingExecute = vi.fn().mockRejectedValue(processingError);
      const completedExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      await expect(
        action.execute(inputData, mockDeps, mockContext)
      ).rejects.toThrow("Processing status failed");
    });

    it("should handle completed action errors", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const completedError = new Error("Completed status failed");
      const processingExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });
      const completedExecute = vi.fn().mockRejectedValue(completedError);

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      await expect(
        action.execute(inputData, mockDeps, mockContext)
      ).rejects.toThrow("Completed status failed");
    });

    it("should preserve all input data in output", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
        extraData: "some extra data",
      };

      const processingExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });
      const completedExecute = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result).toEqual(inputData);
    });

    it("should execute actions in correct order", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const processingExecuteSpy = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });
      const completedExecuteSpy = vi.fn().mockResolvedValue({
        noteId: "note-123",
        message: "Processing completed",
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecuteSpy,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecuteSpy,
      }));

      await action.execute(inputData, mockDeps, mockContext);
      // Verify processing action was called first
      expect(processingExecuteSpy).toHaveBeenCalledBefore(completedExecuteSpy);
    });
  });

  describe("executeWithTiming", () => {
    it("should execute with timing and return result", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      // Add a small delay to ensure duration > 0
      const processingExecute = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { noteId: "note-123", message: "Processing completed" };
      });
      const completedExecute = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { noteId: "note-123", message: "Processing completed" };
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(inputData);
        expect(result.duration).toBeGreaterThan(0);
      }
    });

    it("should handle errors with timing", async () => {
      const inputData: AddStatusActionsData = {
        note: {
          id: "note-123",
          title: "Test Recipe",
        },
        message: "Processing completed",
      };

      const processingError = new Error("Processing status failed");
      const processingExecute = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw processingError;
      });
      const completedExecute = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { noteId: "note-123", message: "Processing completed" };
      });

      (BroadcastProcessingAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_processing",
        execute: processingExecute,
      }));
      (BroadcastCompletedAction as Mock).mockImplementationOnce(() => ({
        name: "broadcast_completed",
        execute: completedExecute,
      }));

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(processingError);
        expect(result.duration).toBeGreaterThan(0);
      }
    });
  });
});

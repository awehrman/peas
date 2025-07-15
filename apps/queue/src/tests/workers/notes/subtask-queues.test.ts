import { describe, it, expect, vi, beforeEach } from "vitest";
import { TestNote, TestFile, TestQueue, TestErrorHandler } from "./types";

describe("notes/subtask-queues", () => {
  let ingredientQueue: TestQueue;
  let instructionQueue: TestQueue;
  let imageQueue: TestQueue;
  let categorizationQueue: TestQueue;
  let ErrorHandler: TestErrorHandler;

  beforeEach(() => {
    ingredientQueue = { name: "ingredient-queue", add: vi.fn() };
    instructionQueue = { name: "instruction-queue", add: vi.fn() };
    imageQueue = { name: "image-queue", add: vi.fn() };
    categorizationQueue = { name: "categorization-queue", add: vi.fn() };
    ErrorHandler = {
      createJobError: vi.fn((err, type, severity, ctx) => ({
        err,
        type,
        severity,
        ctx,
      })),
      logError: vi.fn(),
      withErrorHandling: vi.fn(),
      shouldRetry: vi.fn(),
      calculateBackoff: vi.fn(),
      classifyError: vi.fn(),
      validateJobData: vi.fn(),
    };
  });

  it("queues all sub tasks successfully", async () => {
    const { queueSubTasks } = await import(
      "../../../workers/notes/subtask-queues"
    );
    const note: TestNote = { id: "note-1" };
    const file: TestFile = { title: "Test File" };

    await queueSubTasks(note, file, "job-1", {
      ingredientQueue,
      instructionQueue,
      imageQueue,
      categorizationQueue,
      ErrorHandler,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(ingredientQueue.add).toHaveBeenCalledWith(
      "parse-ingredients",
      { note: { id: "note-1" } },
      { priority: 1 }
    );
    expect(instructionQueue.add).toHaveBeenCalledWith(
      "parse-instructions",
      { note: { id: "note-1" } },
      { priority: 1 }
    );
    expect(imageQueue.add).toHaveBeenCalledWith(
      "process-image",
      { noteId: "note-1", file: { title: "Test File" } },
      { priority: 2 }
    );
    expect(categorizationQueue.add).toHaveBeenCalledWith(
      "categorize-recipe",
      { noteId: "note-1", file: { title: "Test File" } },
      { priority: 3 }
    );
  });

  it("logs error if a subtask queue add fails", async () => {
    const { queueSubTasks } = await import(
      "../../../workers/notes/subtask-queues"
    );
    const note: TestNote = { id: "note-1" };
    const file: TestFile = { title: "Test File" };

    ingredientQueue.add.mockRejectedValueOnce(new Error("fail"));
    await queueSubTasks(note, file, "job-1", {
      ingredientQueue,
      instructionQueue,
      imageQueue,
      categorizationQueue,
      ErrorHandler,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(ErrorHandler.createJobError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        jobId: "job-1",
        subTask: "parse-ingredients",
        queueName: "ingredient-queue",
        operation: "add_sub_task",
      })
    );
    expect(ErrorHandler.logError).toHaveBeenCalled();
  });
});

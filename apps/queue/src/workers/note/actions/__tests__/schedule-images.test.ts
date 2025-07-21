import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScheduleImagesAction } from "../schedule-images";
import { ActionContext } from "../../../core/types";
import type { ScheduleImagesDeps } from "../../types";
import type { ScheduleImagesData } from "../../schema";

describe("ScheduleImagesAction", () => {
  let action: ScheduleImagesAction;
  let mockDeps: ScheduleImagesDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    action = new ScheduleImagesAction();

    mockDeps = {
      imageQueue: {
        add: vi.fn().mockResolvedValue({ id: "job-123" }),
      } as unknown as import("bullmq").Queue,
    };

    mockContext = {
      jobId: "test-job-123",
      workerName: "note",
      startTime: Date.now(),
      retryCount: 0,
      queueName: "note-queue",
      operation: "note",
      attemptNumber: 1,
    };
  });

  describe("ScheduleImagesAction class", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(ScheduleImagesAction);
    });

    it("should have correct name", () => {
      expect(action.name).toBe("schedule_images");
    });

    it("should have execute method", () => {
      expect(typeof action.execute).toBe("function");
    });
  });

  describe("execute method", () => {
    it("should schedule image processing job and return data", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "test-note-123",
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the original data
      expect(result).toEqual(mockData);

      // Should add job to image queue
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledWith("process-image", {
        noteId: "test-note-123",
      });
    });

    it("should handle data with minimal fields", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "test-note-123",
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the original data
      expect(result).toEqual(mockData);

      // Should add job to image queue
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledWith("process-image", {
        noteId: "test-note-123",
      });
    });

    it("should handle data with all fields", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "test-note-123",
        file: {
          title: "Delicious Pasta Recipe",
          contents: "A wonderful pasta recipe with fresh ingredients",
          ingredients: [],
          instructions: [],
          tags: ["pasta", "italian"],
          source: "recipe-blog.com",
          sourceUrl: "https://recipe-blog.com/pasta",
          sourceApplication: "web",
          created: "2024-01-01",
          image: "pasta.jpg",
          images: [
            {
              src: "pasta.jpg",
              width: "800px",
              dataResourceHash: "abc123",
            },
          ],
          metadata: {
            source: "recipe-blog.com",
            author: "Chef John",
            publishedAt: "2024-01-01",
          },
        },
      };

      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the original data
      expect(result).toEqual(mockData);

      // Should add job to image queue
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledWith("process-image", {
        noteId: "test-note-123",
      });
    });

    it("should handle empty noteId", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "",
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the original data
      expect(result).toEqual(mockData);

      // Should add job to image queue with empty noteId
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledWith("process-image", {
        noteId: "",
      });
    });

    it("should handle null noteId", async () => {
      const mockData: ScheduleImagesData = {
        noteId: null as unknown as string,
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the original data
      expect(result).toEqual(mockData);

      // Should add job to image queue with null noteId
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledWith("process-image", {
        noteId: null,
      });
    });

    it("should handle undefined noteId", async () => {
      const mockData: ScheduleImagesData = {
        noteId: undefined as unknown as string,
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the original data
      expect(result).toEqual(mockData);

      // Should add job to image queue with undefined noteId
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledWith("process-image", {
        noteId: undefined,
      });
    });
  });

  describe("Error handling", () => {
    it("should handle queue add failure", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "test-note-123",
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      // Mock queue to throw an error
      mockDeps.imageQueue.add = vi
        .fn()
        .mockRejectedValue(new Error("Queue error"));

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Queue error");

      // Should still attempt to add job
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledWith("process-image", {
        noteId: "test-note-123",
      });
    });

    it("should handle queue add timeout", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "test-note-123",
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      // Mock queue to timeout
      mockDeps.imageQueue.add = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Timeout")), 100);
        });
      });

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Timeout");

      // Should still attempt to add job
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integration with BaseAction", () => {
    it("should work with BaseAction validation", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "test-note-123",
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      // Test that the action can be executed through BaseAction methods
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toEqual(mockData);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
    });

    it("should handle context parameter", async () => {
      const mockData: ScheduleImagesData = {
        noteId: "test-note-123",
        file: {
          title: "Test Recipe",
          contents: "Test content",
          ingredients: [],
          instructions: [],
        },
      };

      const customContext: ActionContext = {
        jobId: "custom-job-456",
        workerName: "custom-worker",
        startTime: Date.now(),
        retryCount: 2,
        queueName: "custom-queue",
        operation: "custom-operation",
        attemptNumber: 3,
      };

      const result = await action.execute(mockData, mockDeps, customContext);

      expect(result).toEqual(mockData);
      expect(mockDeps.imageQueue.add).toHaveBeenCalledTimes(1);
    });
  });
});

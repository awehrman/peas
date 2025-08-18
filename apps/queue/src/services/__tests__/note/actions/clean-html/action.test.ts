/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { CleanHtmlAction } from "../../../../note/actions/clean-html/action";

// Mock the html-cleaner utility
vi.mock("../../../../../utils/html-cleaner", () => ({
  calculateRemovedSize: vi.fn(),
}));

describe("CleanHtmlAction", () => {
  let action: CleanHtmlAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockCalculateRemovedSize: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create action instance
    action = new CleanHtmlAction();

    // Create mock data
    mockData = {
      content: "<html><body><h1>Test Recipe</h1></body></html>",
      jobId: "test-job-123",
      noteId: "test-note-456",
      importId: "test-import-789",
      metadata: { source: "test" },
    };

    // Create mock dependencies
    mockDeps = {
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
    } as NoteWorkerDependencies;

    // Create mock context
    mockContext = {
      jobId: "test-job-123",
      queueName: "notes",
      retryCount: 0,
      startTime: Date.now(),
      operation: "clean_html",
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Get mocked functions
    mockCalculateRemovedSize = vi.mocked(
      (await import("../../../../../utils/html-cleaner")).calculateRemovedSize
    );

    // Setup default mock implementations
    (mockDeps.services.cleanHtml as any).mockResolvedValue(mockData);
    mockCalculateRemovedSize.mockReturnValue("1.5KB");
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.CLEAN_HTML);
    });
  });

  describe("execute", () => {
    it("should execute the service action with correct parameters", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(mockData);
      expect(result).toBe(mockData);
    });

    it("should call executeServiceAction with correct options", async () => {
      // Spy on executeServiceAction

      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(mockData, mockDeps, mockContext);

      expect(executeServiceActionSpy).toHaveBeenCalledWith({
        data: mockData,
        deps: mockDeps,
        context: mockContext,
        serviceCall: expect.any(Function),
        contextName: "clean_html",
        startMessage: "Cleaning .html files...",
        completionMessage: "Cleaned .html files!",
        additionalBroadcasting: expect.any(Function),
      });
    });

    it("should handle service call correctly", async () => {
      const cleanedData = {
        ...mockData,
        content: "<html><body><h1>Cleaned Recipe</h1></body></html>",
      };

      (mockDeps.services.cleanHtml as any).mockResolvedValue(cleanedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(cleanedData);
    });

    it("should handle different content lengths", async () => {
      const longContent = "a".repeat(10000);
      const dataWithLongContent = {
        ...mockData,
        content: longContent,
      };

      const result = await action.execute(
        dataWithLongContent,
        mockDeps,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(
        dataWithLongContent
      );
    });

    it("should handle empty content", async () => {
      const dataWithEmptyContent = {
        ...mockData,
        content: "",
      };

      const result = await action.execute(
        dataWithEmptyContent,
        mockDeps,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(
        dataWithEmptyContent
      );
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service error");

      (mockDeps.services.cleanHtml as any).mockRejectedValue(serviceError);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should maintain retryable configuration", () => {
      expect(action.retryable).toBe(true);
    });

    it("should maintain priority configuration", () => {
      expect(action.priority).toBe(0);
    });

    it("should work with different dependency configurations", async () => {
      const minimalDeps = {
        services: {
          parseHtml: vi.fn(),
          cleanHtml: vi.fn().mockResolvedValue(mockData),
          saveNote: vi.fn(),
        },
        logger: {
          log: vi.fn(),
        },
      } as NoteWorkerDependencies;

      const result = await action.execute(mockData, minimalDeps, mockContext);

      expect(result).toBe(mockData);
    });

    it("should work with different context configurations", async () => {
      const differentContext = {
        jobId: "different-job",
        queueName: "different-queue",
        retryCount: 1,
        startTime: Date.now() - 1000,
        operation: "clean_html",
        workerName: "different-worker",
        attemptNumber: 2,
      };

      const result = await action.execute(mockData, mockDeps, differentContext);

      expect(result).toBe(mockData);
    });

    it("should handle null or undefined data gracefully", async () => {
      const nullData = null as unknown as NotePipelineData;

      // Mock the service to return the null data
      (mockDeps.services.cleanHtml as any).mockResolvedValue(nullData);

      const result = await action.execute(nullData, mockDeps, mockContext);

      expect(result).toBe(nullData);
    });

    it("should handle data without content property", async () => {
      const dataWithoutContent = {
        jobId: "test-job-123",
        noteId: "test-note-456",
        importId: "test-import-789",
        metadata: { source: "test" },
      } as unknown as NotePipelineData;

      // Mock the service to return the data without content
      (mockDeps.services.cleanHtml as any).mockResolvedValue(
        dataWithoutContent
      );

      const result = await action.execute(
        dataWithoutContent,
        mockDeps,
        mockContext
      );

      expect(result).toBe(dataWithoutContent);
    });
  });

  describe("inheritance and type safety", () => {
    it("should extend BaseAction correctly", () => {
      expect(action).toBeInstanceOf(CleanHtmlAction);
      expect(action).toHaveProperty("execute");
      expect(action).toHaveProperty("name");
    });

    it("should implement required interface methods", () => {
      expect(typeof action.execute).toBe("function");
      expect(typeof action.name).toBe("string");
    });

    it("should have correct generic types", () => {
      // This test ensures TypeScript compilation works correctly
      const typedAction: CleanHtmlAction = action;
      expect(typedAction).toBeDefined();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestError } from "../../../test-utils/service";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import type { ActionContext } from "../../../workers/core/types";
import { CleanHtmlAction, cleanHtmlFile } from "../../note/clean-html";

// Mock the HTML cleaner utilities
vi.mock("../../../utils/html-cleaner", () => ({
  calculateRemovedSize: vi.fn((original: number, cleaned: number) => {
    const removed = original - cleaned;
    return removed >= 1024 * 1024
      ? `${(removed / (1024 * 1024)).toFixed(2)}MB`
      : `${(removed / 1024).toFixed(1)}KB`;
  }),
  logCleaningStats: vi.fn(),
  removeIconsTags: vi.fn((content: string) =>
    content.replace(/<icons[^>]*>[\s\S]*?<\/icons>/gi, "")
  ),
  removeStyleTags: vi.fn((content: string) =>
    content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  ),
  resolveTitle: vi.fn(
    (data: NotePipelineData, _html: string) =>
      data.source?.filename || data.source?.url || "Untitled"
  ),
}));

describe("CleanHtmlAction", () => {
  let mockDeps: NoteWorkerDependencies;
  let mockData: NotePipelineData;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    } as unknown as NoteWorkerDependencies;

    mockData = {
      content:
        "<html><style>body { color: red; }</style><body><h1>Test Recipe</h1><icons>icon1</icons><p>Content</p></body></html>",
      importId: "test-import-123",
      noteId: "test-note-456",
      source: {
        filename: "test-recipe.html",
        url: "https://example.com/recipe",
      },
    };

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note",
      noteId: "test-note-456",
      operation: "clean-html-test",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("CleanHtmlAction class", () => {
    it("should have correct action name", () => {
      const action = new CleanHtmlAction();
      expect(action.name).toBe("clean_html");
    });

    it("should execute successfully with importId and status broadcaster", async () => {
      const action = new CleanHtmlAction();
      const cleanedData = {
        ...mockData,
        content: "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>",
      };

      vi.mocked(mockDeps.services.cleanHtml).mockResolvedValue(cleanedData);
      if (mockDeps.statusBroadcaster?.addStatusEventAndBroadcast) {
        vi.mocked(
          mockDeps.statusBroadcaster.addStatusEventAndBroadcast
        ).mockResolvedValue({} as Record<string, unknown>);
      }

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(mockData);
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);

      // Check start status broadcast
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PROCESSING",
        message: "HTML cleaning started",
        context: "clean_html",
        indentLevel: 1,
      });

      // Check completion status broadcast
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "COMPLETED",
        message: expect.stringContaining("HTML cleaning completed"),
        context: "clean_html",
        indentLevel: 1,
      });

      expect(result).toEqual(cleanedData);
    });

    it("should execute successfully without importId", async () => {
      const action = new CleanHtmlAction();
      const dataWithoutImportId = { ...mockData };
      delete dataWithoutImportId.importId;
      const cleanedData = {
        ...dataWithoutImportId,
        content: "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>",
      };

      vi.mocked(mockDeps.services.cleanHtml).mockResolvedValue(cleanedData);

      const result = await action.execute(
        dataWithoutImportId,
        mockDeps,
        mockContext
      );

      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(
        dataWithoutImportId
      );
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(result).toEqual(cleanedData);
    });

    it("should execute successfully without status broadcaster", async () => {
      const action = new CleanHtmlAction();
      const depsWithoutBroadcaster = { ...mockDeps };
      delete depsWithoutBroadcaster.statusBroadcaster;
      const cleanedData = {
        ...mockData,
        content: "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>",
      };

      vi.mocked(mockDeps.services.cleanHtml).mockResolvedValue(cleanedData);

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(cleanedData);
    });

    it("should handle start status broadcast error", async () => {
      const action = new CleanHtmlAction();
      const error = createTestError("Broadcast error");
      const cleanedData = {
        ...mockData,
        content: "<html><body>Cleaned content</body></html>",
      };

      vi.mocked(mockDeps.services.cleanHtml).mockResolvedValue(cleanedData);
      if (mockDeps.statusBroadcaster?.addStatusEventAndBroadcast) {
        vi.mocked(
          mockDeps.statusBroadcaster.addStatusEventAndBroadcast
        ).mockRejectedValueOnce(error);
      }

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[CLEAN_HTML] Failed to broadcast start status: Error: Broadcast error",
        "error"
      );
      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(cleanedData);
    });

    it("should handle completion status broadcast error", async () => {
      const action = new CleanHtmlAction();
      const error = createTestError("Broadcast error");
      const cleanedData = {
        ...mockData,
        content: "<html><body>Cleaned content</body></html>",
      };

      vi.mocked(mockDeps.services.cleanHtml).mockResolvedValue(cleanedData);
      if (mockDeps.statusBroadcaster?.addStatusEventAndBroadcast) {
        vi.mocked(mockDeps.statusBroadcaster.addStatusEventAndBroadcast)
          .mockResolvedValueOnce({} as Record<string, unknown>)
          .mockRejectedValueOnce(error);
      }

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[CLEAN_HTML] Failed to broadcast completion status: Error: Broadcast error",
        "error"
      );
      expect(mockDeps.services.cleanHtml).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(cleanedData);
    });

    it("should handle service error", async () => {
      const action = new CleanHtmlAction();
      const error = createTestError("Service error");

      vi.mocked(mockDeps.services.cleanHtml).mockRejectedValue(error);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });
  });

  describe("cleanHtmlFile function", () => {
    it("should clean HTML content successfully", async () => {
      const htmlCleanerModule = await import("../../../utils/html-cleaner");
      const mockResolveTitle = vi.mocked(htmlCleanerModule.resolveTitle);
      const mockRemoveStyleTags = vi.mocked(htmlCleanerModule.removeStyleTags);
      const mockRemoveIconsTags = vi.mocked(htmlCleanerModule.removeIconsTags);
      const mockLogCleaningStats = vi.mocked(
        htmlCleanerModule.logCleaningStats
      );

      mockResolveTitle.mockReturnValue("Test Recipe");
      mockRemoveStyleTags.mockReturnValue(
        "<html><body><h1>Test Recipe</h1><icons>icon1</icons><p>Content</p></body></html>"
      );
      mockRemoveIconsTags.mockReturnValue(
        "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>"
      );

      const result = await cleanHtmlFile(mockData, mockDeps.logger);

      expect(mockResolveTitle).toHaveBeenCalledWith(mockData, mockData.content);
      expect(mockRemoveStyleTags).toHaveBeenCalledWith(mockData.content);
      expect(mockRemoveIconsTags).toHaveBeenCalledWith(
        "<html><body><h1>Test Recipe</h1><icons>icon1</icons><p>Content</p></body></html>"
      );
      expect(mockLogCleaningStats).toHaveBeenCalledWith(
        mockDeps.logger,
        "Test Recipe",
        mockData.content.length,
        "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>".length,
        mockData.content.length,
        "<html><body><h1>Test Recipe</h1><icons>icon1</icons><p>Content</p></body></html>"
          .length,
        "<html><body><h1>Test Recipe</h1><icons>icon1</icons><p>Content</p></body></html>"
          .length,
        "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>".length
      );

      expect(result).toEqual({
        ...mockData,
        content: "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>",
      });
    });

    it("should handle HTML with no style or icons tags", async () => {
      const dataWithoutTags = {
        ...mockData,
        content: "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>",
      };

      const htmlCleanerModule = await import("../../../utils/html-cleaner");
      const mockResolveTitle = vi.mocked(htmlCleanerModule.resolveTitle);
      const mockRemoveStyleTags = vi.mocked(htmlCleanerModule.removeStyleTags);
      const mockRemoveIconsTags = vi.mocked(htmlCleanerModule.removeIconsTags);
      const mockLogCleaningStats = vi.mocked(
        htmlCleanerModule.logCleaningStats
      );

      mockResolveTitle.mockReturnValue("Test Recipe");
      mockRemoveStyleTags.mockReturnValue(dataWithoutTags.content);
      mockRemoveIconsTags.mockReturnValue(dataWithoutTags.content);

      const result = await cleanHtmlFile(dataWithoutTags, mockDeps.logger);

      expect(result).toEqual(dataWithoutTags);
      expect(mockLogCleaningStats).toHaveBeenCalledWith(
        mockDeps.logger,
        "Test Recipe",
        dataWithoutTags.content.length,
        dataWithoutTags.content.length,
        dataWithoutTags.content.length,
        dataWithoutTags.content.length,
        dataWithoutTags.content.length,
        dataWithoutTags.content.length
      );
    });

    it("should handle empty content", async () => {
      const dataWithEmptyContent = {
        ...mockData,
        content: "",
      };

      const htmlCleanerModule = await import("../../../utils/html-cleaner");
      const mockResolveTitle = vi.mocked(htmlCleanerModule.resolveTitle);
      const mockRemoveStyleTags = vi.mocked(htmlCleanerModule.removeStyleTags);
      const mockRemoveIconsTags = vi.mocked(htmlCleanerModule.removeIconsTags);

      mockResolveTitle.mockReturnValue("Test Recipe");
      mockRemoveStyleTags.mockReturnValue("");
      mockRemoveIconsTags.mockReturnValue("");

      const result = await cleanHtmlFile(dataWithEmptyContent, mockDeps.logger);

      expect(result).toEqual({
        ...dataWithEmptyContent,
        content: "",
      });
    });

    it("should handle data without source information", async () => {
      const dataWithoutSource = {
        ...mockData,
        source: undefined,
      };

      const htmlCleanerModule = await import("../../../utils/html-cleaner");
      const mockResolveTitle = vi.mocked(htmlCleanerModule.resolveTitle);
      const mockRemoveStyleTags = vi.mocked(htmlCleanerModule.removeStyleTags);
      const mockRemoveIconsTags = vi.mocked(htmlCleanerModule.removeIconsTags);

      mockResolveTitle.mockReturnValue("Untitled");
      mockRemoveStyleTags.mockReturnValue(
        "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>"
      );
      mockRemoveIconsTags.mockReturnValue(
        "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>"
      );

      const result = await cleanHtmlFile(dataWithoutSource, mockDeps.logger);

      expect(mockResolveTitle).toHaveBeenCalledWith(
        dataWithoutSource,
        dataWithoutSource.content
      );
      expect(result).toEqual({
        ...dataWithoutSource,
        content: "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>",
      });
    });
  });
});

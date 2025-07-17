import { describe, it, expect, vi, beforeEach } from "vitest";
import { CleanHtmlAction } from "../clean-html";
import type { CleanHtmlData, CleanHtmlDeps } from "../clean-html";
import type { ActionContext } from "../../../core/types";

describe("CleanHtmlAction", () => {
  let action: CleanHtmlAction;
  let mockDeps: CleanHtmlDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    action = new CleanHtmlAction();
    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    };
    mockContext = {
      operation: "test_operation",
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should remove style tags and their content", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <style>
                body { color: red; }
                .test { background: blue; }
              </style>
            </head>
            <body>
              <h1>Test Content</h1>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("body { color: red; }");
      expect(result.content).not.toContain(".test { background: blue; }");
      expect(result.content).toContain("<h1>Test Content</h1>");
    });

    it("should remove icons tags and their content", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <icons>
                <icon name="test-icon" />
                <icon name="another-icon" />
              </icons>
            </head>
            <body>
              <h1>Test Content</h1>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<icons>");
      expect(result.content).not.toContain('<icon name="test-icon" />');
      expect(result.content).not.toContain('<icon name="another-icon" />');
      expect(result.content).toContain("<h1>Test Content</h1>");
    });

    it("should remove both style and icons tags", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <style>
                body { color: red; }
              </style>
              <icons>
                <icon name="test-icon" />
              </icons>
            </head>
            <body>
              <h1>Test Content</h1>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("body { color: red; }");
      expect(result.content).not.toContain("<icons>");
      expect(result.content).not.toContain('<icon name="test-icon" />');
      expect(result.content).toContain("<h1>Test Content</h1>");
    });

    it("should handle HTML without style or icons tags", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <body>
              <h1>Test Content</h1>
              <p>This is a paragraph.</p>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).toBe(inputData.content);
    });

    it("should preserve all other properties", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
        noteId: "test-note-123",
        source: {
          filename: "test.html",
          url: "https://example.com/test.html",
        },
        metadata: {
          author: "Test Author",
          date: "2023-01-01",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.noteId).toBe("test-note-123");
      expect(result.source?.filename).toBe("test.html");
      expect(result.source?.url).toBe("https://example.com/test.html");
      expect(result.metadata?.author).toBe("Test Author");
      expect(result.metadata?.date).toBe("2023-01-01");
      expect(result.content).toBe(inputData.content);
    });

    it("should handle content without title", async () => {
      const inputData: CleanHtmlData = {
        content:
          "<html><style>body { color: red; }</style><body><h1>Test</h1></body></html>",
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle style tags with attributes", async () => {
      const inputData: CleanHtmlData = {
        content:
          '<html><style type="text/css" media="screen">body { color: red; }</style><body><h1>Test</h1></body></html>',
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain(
        '<style type="text/css" media="screen">'
      );
      expect(result.content).not.toContain("body { color: red; }");
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle icons tags with attributes", async () => {
      const inputData: CleanHtmlData = {
        content:
          '<html><icons class="app-icons" data-version="1.0"><icon name="test-icon" /></icons><body><h1>Test</h1></body></html>',
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain(
        '<icons class="app-icons" data-version="1.0">'
      );
      expect(result.content).not.toContain('<icon name="test-icon" />');
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle case-insensitive tag matching", async () => {
      const inputData: CleanHtmlData = {
        content:
          "<html><STYLE>body { color: red; }</STYLE><ICONS><icon name='test-icon' /></ICONS><body><h1>Test Content</h1></body></html>",
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<STYLE>");
      expect(result.content).not.toContain("<ICONS>");
      expect(result.content).toContain("<h1>Test Content</h1>");
    });

    it("should handle nested tags within style and icons", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <style>
                /* Nested comment */
                body { color: red; }
              </style>
              <icons>
                <nested>content</nested>
              </icons>
            </head>
            <body>
              <h1>Test Content</h1>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("/* Nested comment */");
      expect(result.content).not.toContain("<icons>");
      expect(result.content).not.toContain("<nested>content</nested>");
      expect(result.content).toContain("<h1>Test Content</h1>");
    });

    it("should handle multiple style and icons tags", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <style>body { color: red; }</style>
              <icons><icon name="icon1" /></icons>
              <style>p { margin: 0; }</style>
              <icons><icon name="icon2" /></icons>
            </head>
            <body>
              <h1>Test</h1>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle empty style and icons tags", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <style></style>
              <icons></icons>
            </head>
            <body>
              <h1>Test</h1>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style></style>");
      expect(result.content).not.toContain("<icons></icons>");
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle malformed HTML", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <style>
            body { color: red; }
          </style>
          <h1>Test</h1>
          <icons>
            <icon name="test" />
          </icons>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("<icons>");
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle very large content", async () => {
      const largeStyleContent = "body { color: red; }".repeat(1000);
      const largeIconsContent = '<icon name="test" />'.repeat(1000);

      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <style>${largeStyleContent}</style>
              <icons>${largeIconsContent}</icons>
            </head>
            <body>
              <h1>Test</h1>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("<icons>");
      expect(result.content).not.toContain(largeStyleContent);
      expect(result.content).not.toContain(largeIconsContent);
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should broadcast status events when noteId is provided", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
        noteId: "test-note-123",
      };

      await action.execute(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start status
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        noteId: "test-note-123",
        status: "PROCESSING",
        message: expect.stringContaining("HTML cleaning started"),
        context: "clean_html",
      });

      // Check completion status
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        noteId: "test-note-123",
        status: "COMPLETED",
        message: expect.stringContaining("HTML cleaning completed"),
        context: "clean_html",
      });
    });

    it("should not broadcast status events when noteId is not provided", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
      };

      await action.execute(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle broadcast errors gracefully", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
        noteId: "test-note-123",
      };

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const mockAddStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(new Error("Broadcast failed"));
      const mockDepsWithError: CleanHtmlDeps = {
        addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
      };

      const result = await action.execute(
        inputData,
        mockDepsWithError,
        mockContext
      );

      expect(result.content).toBe("<html><body><h1>Test</h1></body></html>");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to broadcast start status"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should extract title from H1 tag when no source filename is provided", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test Document Title</h1></body></html>",
        noteId: "test-note-123",
      };

      await action.execute(inputData, mockDeps, mockContext);

      // The action should still work and broadcast status
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalled();
    });

    it("should extract title from meta itemprop when no H1 is found", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <meta itemprop="title" content="Meta Title" />
            </head>
            <body>
              <p>No H1 here</p>
            </body>
          </html>
        `,
        noteId: "test-note-123",
      };

      await action.execute(inputData, mockDeps, mockContext);

      // The action should still work and broadcast status
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalled();
    });
  });
});

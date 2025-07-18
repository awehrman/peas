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
        importId: "test-import-123",
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
        importId: "test-import-123",
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
        importId: "test-import-123",
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
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).toBe(inputData.content);
    });

    it("should preserve all other properties", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
        importId: "test-import-123",
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

      expect(result.importId).toBe("test-import-123");
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
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle style tags with attributes", async () => {
      const inputData: CleanHtmlData = {
        content:
          '<html><style type="text/css" media="screen">body { color: red; }</style><body><h1>Test</h1></body></html>',
        importId: "test-import-123",
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
        importId: "test-import-123",
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
        importId: "test-import-123",
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
                body { color: red; }
                <div>Nested content</div>
                .test { background: blue; }
              </style>
              <icons>
                <icon name="test-icon" />
                <div>Nested content</div>
                <icon name="another-icon" />
              </icons>
            </head>
            <body>
              <h1>Test Content</h1>
            </body>
          </html>
        `,
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("body { color: red; }");
      expect(result.content).not.toContain("<div>Nested content</div>");
      expect(result.content).not.toContain(".test { background: blue; }");
      expect(result.content).not.toContain("<icons>");
      expect(result.content).not.toContain('<icon name="test-icon" />');
      expect(result.content).not.toContain('<icon name="another-icon" />');
      expect(result.content).toContain("<h1>Test Content</h1>");
    });

    it("should handle multiple style and icons tags", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <style type="text/css">body { color: red; }</style>
              <icons class="app-icons"><icon name="test-icon" /></icons>
              <style>p { margin: 0; }</style>
              <icons><icon name="another-icon" /></icons>
            </head>
            <body>
              <h1>Test</h1>
              <p>This is a paragraph.</p>
            </body>
          </html>
        `,
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style");
      expect(result.content).not.toContain("body { color: red; }");
      expect(result.content).not.toContain("p { margin: 0; }");
      expect(result.content).not.toContain("<icons");
      expect(result.content).not.toContain('<icon name="test-icon" />');
      expect(result.content).not.toContain('<icon name="another-icon" />');
      expect(result.content).toContain("<h1>Test</h1>");
      expect(result.content).toContain("<p>This is a paragraph.</p>");
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
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style></style>");
      expect(result.content).not.toContain("<icons></icons>");
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle malformed HTML", async () => {
      const inputData: CleanHtmlData = {
        content: `
          
          <style>body { color: red; }</style>
          <icons><icon name="test-icon" /></icons>
          <h1>Test</h1>
          
        `,
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("body { color: red; }");
      expect(result.content).not.toContain("<icons>");
      expect(result.content).not.toContain('<icon name="test-icon" />');
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should handle very large content", async () => {
      const largeStyle =
        "<style>" + "body { color: red; }".repeat(1000) + "</style>";
      const largeIcons =
        "<icons>" + '<icon name="test-icon" />'.repeat(1000) + "</icons>";

      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              ${largeStyle}
              ${largeIcons}
            </head>
            <body>
              <h1>Test</h1>
            </body>
          </html>
        `,
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("body { color: red; }");
      expect(result.content).not.toContain("<icons>");
      expect(result.content).not.toContain('<icon name="test-icon" />');
      expect(result.content).toContain("<h1>Test</h1>");
    });

    it("should broadcast status events when importId is provided", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
        importId: "test-import-123",
      };

      await action.execute(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(2);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PROCESSING",
        message: "Cleaning HTML file...",
        context: "clean_html",
      });
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "COMPLETED",
        message: "HTML cleaning completed",
        context: "clean_html",
      });
    });

    it("should not broadcast status events when importId is not provided", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
      };

      await action.execute(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle broadcast errors gracefully", async () => {
      const mockErrorDeps: CleanHtmlDeps = {
        addStatusEventAndBroadcast: vi
          .fn()
          .mockRejectedValue(new Error("Broadcast failed")),
      };

      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test</h1></body></html>",
        importId: "test-import-123",
      };

      const result = await action.execute(
        inputData,
        mockErrorDeps,
        mockContext
      );

      expect(result.content).toBe("<html><body><h1>Test</h1></body></html>");
      expect(mockErrorDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(2);
    });

    it("should extract title from H1 tag when no source filename is provided", async () => {
      const inputData: CleanHtmlData = {
        content: "<html><body><h1>Test Document Title</h1></body></html>",
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).toBe(
        "<html><body><h1>Test Document Title</h1></body></html>"
      );
    });

    it("should extract title from meta itemprop when no H1 is found", async () => {
      const inputData: CleanHtmlData = {
        content: `
          <html>
            <head>
              <meta itemprop="title" content="Meta Title" />
            </head>
            <body>
              <p>No H1 tag here</p>
            </body>
          </html>
        `,
        importId: "test-import-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.content).toContain(
        '<meta itemprop="title" content="Meta Title" />'
      );
      expect(result.content).toContain("<p>No H1 tag here</p>");
    });
  });
});

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
        file: {
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
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain("<style>");
      expect(result.file.content).not.toContain("body { color: red; }");
      expect(result.file.content).not.toContain(".test { background: blue; }");
      expect(result.file.content).toContain("<h1>Test Content</h1>");
      expect(result.file.title).toBe("Test Document");
    });

    it("should remove icons tags and their content", async () => {
      const inputData: CleanHtmlData = {
        file: {
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
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain("<icons>");
      expect(result.file.content).not.toContain('<icon name="test-icon" />');
      expect(result.file.content).not.toContain('<icon name="another-icon" />');
      expect(result.file.content).toContain("<h1>Test Content</h1>");
    });

    it("should remove both style and icons tags", async () => {
      const inputData: CleanHtmlData = {
        file: {
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
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain("<style>");
      expect(result.file.content).not.toContain("body { color: red; }");
      expect(result.file.content).not.toContain("<icons>");
      expect(result.file.content).not.toContain('<icon name="test-icon" />');
      expect(result.file.content).toContain("<h1>Test Content</h1>");
    });

    it("should handle HTML without style or icons tags", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: `
            <html>
              <body>
                <h1>Test Content</h1>
                <p>This is a paragraph.</p>
              </body>
            </html>
          `,
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).toBe(inputData.file.content);
      expect(result.file.title).toBe("Test Document");
    });

    it("should preserve all other file properties", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: "<html><body><h1>Test</h1></body></html>",
          title: "Test Document",
          author: "Test Author",
          date: "2023-01-01",
        } as CleanHtmlData["file"],
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.title).toBe("Test Document");
      expect((result.file as CleanHtmlData["file"]).author).toBe("Test Author");
      expect((result.file as CleanHtmlData["file"]).date).toBe("2023-01-01");
      expect(result.file.content).toBe(inputData.file.content);
    });

    it("should handle files without title", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content:
            "<html><style>body { color: red; }</style><body><h1>Test</h1></body></html>",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain("<style>");
      expect(result.file.content).toContain("<h1>Test</h1>");
    });

    it("should handle style tags with attributes", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content:
            '<html><style type="text/css" media="screen">body { color: red; }</style><body><h1>Test</h1></body></html>',
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain(
        '<style type="text/css" media="screen">'
      );
      expect(result.file.content).not.toContain("body { color: red; }");
      expect(result.file.content).toContain("<h1>Test</h1>");
    });

    it("should handle icons tags with attributes", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content:
            '<html><icons class="app-icons" data-version="1.0"><icon name="test-icon" /></icons><body><h1>Test</h1></body></html>',
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain(
        '<icons class="app-icons" data-version="1.0">'
      );
      expect(result.file.content).not.toContain('<icon name="test-icon" />');
      expect(result.file.content).toContain("<h1>Test</h1>");
    });

    it("should handle case-insensitive tag matching", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: `
            <html>
              <head>
                <STYLE>
                  body { color: red; }
                </STYLE>
                <ICONS>
                  <icon name="test-icon" />
                </ICONS>
              </head>
              <body>
                <h1>Test Content</h1>
              </body>
            </html>
          `,
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain("<STYLE>");
      expect(result.file.content).not.toContain("<ICONS>");
      expect(result.file.content).toContain("<h1>Test Content</h1>");
    });

    it("should handle nested tags correctly", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: `
            <html>
              <head>
                <style>
                  body { 
                    color: red; 
                    /* Nested comment */
                  }
                </style>
                <icons>
                  <icon name="test-icon">
                    <nested>content</nested>
                  </icon>
                </icons>
              </head>
              <body>
                <h1>Test Content</h1>
              </body>
            </html>
          `,
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(result.file.content).not.toContain("<style>");
      expect(result.file.content).not.toContain("/* Nested comment */");
      expect(result.file.content).not.toContain("<icons>");
      expect(result.file.content).not.toContain("<nested>content</nested>");
      expect(result.file.content).toContain("<h1>Test Content</h1>");
    });

    it("should broadcast status events when noteId is provided", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content:
            "<html><style>body { color: red; }</style><body><h1>Test</h1></body></html>",
          title: "Test Document",
        },
        noteId: "note-123",
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start status
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenNthCalledWith(1, {
        noteId: "note-123",
        status: "PROCESSING",
        message: expect.stringContaining("HTML cleaning started:"),
        context: "clean_html",
      });

      // Check completion status
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenNthCalledWith(2, {
        noteId: "note-123",
        status: "COMPLETED",
        message: expect.stringContaining("HTML cleaning completed:"),
        context: "clean_html",
      });

      expect(result.file.content).not.toContain("<style>");
      expect(result.file.content).toContain("<h1>Test</h1>");
    });

    it("should not broadcast status events when noteId is not provided", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content:
            "<html><style>body { color: red; }</style><body><h1>Test</h1></body></html>",
          title: "Test Document",
        },
      };

      const result = await action.execute(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
      expect(result.file.content).not.toContain("<style>");
      expect(result.file.content).toContain("<h1>Test</h1>");
    });

    it("should truncate content in status messages to 50 characters", async () => {
      const longContent = "<html><body>" + "x".repeat(100) + "</body></html>";
      const inputData: CleanHtmlData = {
        file: {
          content: longContent,
          title: "Test Document",
        },
        noteId: "note-123",
      };

      await action.execute(inputData, mockDeps, mockContext);

      // Check that status messages contain truncated content
      const calls = vi.mocked(mockDeps.addStatusEventAndBroadcast).mock.calls;

      // Start message should be truncated
      expect(calls[0]![0].message).toMatch(
        /HTML cleaning started: .{50}\.\.\./
      );

      // Completion message should be truncated
      expect(calls[1]![0].message).toMatch(
        /HTML cleaning completed: .{50}\.\.\./
      );
    });

    it("should use file.title if present", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: "<html><body><h1>Should Not Use</h1></body></html>",
          title: "Title from file.title",
          metadata: { title: "Title from metadata" },
        },
        noteId: "note-123",
      };
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await action.execute(inputData, mockDeps, mockContext);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cleaning HTML: Title from file.title")
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "HTML cleaning completed: Title from file.title"
        )
      );
      logSpy.mockRestore();
    });

    it("should use file.metadata.title if file.title is missing", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: "<html><body><h1>Should Not Use</h1></body></html>",
          metadata: { title: "Title from metadata" },
        },
        noteId: "note-123",
      };
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await action.execute(inputData, mockDeps, mockContext);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cleaning HTML: Title from metadata")
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("HTML cleaning completed: Title from metadata")
      );
      logSpy.mockRestore();
    });

    it("should use first <h1> if file.title and metadata.title are missing", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: "<html><body><h1>Title from h1</h1></body></html>",
        },
        noteId: "note-123",
      };
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await action.execute(inputData, mockDeps, mockContext);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cleaning HTML: Title from h1")
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("HTML cleaning completed: Title from h1")
      );
      logSpy.mockRestore();
    });

    it("should fallback to 'Untitled' if no title or <h1>", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content: "<html><body><p>No title here</p></body></html>",
        },
        noteId: "note-123",
      };
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await action.execute(inputData, mockDeps, mockContext);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cleaning HTML: Untitled")
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("HTML cleaning completed: Untitled")
      );
      logSpy.mockRestore();
    });
  });

  describe("executeWithTiming", () => {
    it("should execute with timing and return result", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content:
            "<html><style>body { color: red; }</style><body><h1>Test</h1></body></html>",
          title: "Test Document",
        },
        noteId: "note-123",
      };

      // Add a small delay to ensure duration > 0
      const executeSpy = vi
        .spyOn(action, "execute")
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            file: {
              content: "<html><body><h1>Test</h1></body></html>",
              title: "Test Document",
            },
            noteId: "note-123",
          };
        });

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const data = result.data as CleanHtmlData;
        expect(data.file.content).not.toContain("<style>");
        expect(data.file.content).toContain("<h1>Test</h1>");
        expect(result.duration).toBeGreaterThan(0);
      }

      executeSpy.mockRestore();
    });

    it("should handle errors with timing", async () => {
      const inputData: CleanHtmlData = {
        file: {
          content:
            "<html><style>body { color: red; }</style><body><h1>Test</h1></body></html>",
          title: "Test Document",
        },
        noteId: "note-123",
      };

      // Mock the execute method to throw an error with delay
      const executeSpy = vi
        .spyOn(action, "execute")
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Test error");
        });

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Test error");
        expect(result.duration).toBeGreaterThan(0);
      }

      executeSpy.mockRestore();
    });
  });
});

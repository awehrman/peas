import { describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../types";
import type { NotePipelineData } from "../../types/notes";
import {
  calculateRemovedSize,
  extractTitleFromHtml,
  logCleaningStats,
  removeIconsTags,
  removeStyleTags,
  resolveTitle,
} from "../html-cleaner";

describe("HTML Cleaner", () => {
  describe("extractTitleFromHtml", () => {
    it("should extract title from H1 tag", () => {
      const html =
        "<html><head></head><body><h1>Recipe Title</h1><p>Content</p></body></html>";

      const title = extractTitleFromHtml(html);

      expect(title).toBe("Recipe Title");
    });

    it("should extract title from H1 tag with attributes", () => {
      const html =
        '<html><body><h1 class="title" id="main-title">Spicy Chicken Recipe</h1></body></html>';

      const title = extractTitleFromHtml(html);

      expect(title).toBe("Spicy Chicken Recipe");
    });

    it("should extract title from meta itemprop title", () => {
      const html =
        '<html><head><meta itemprop="title" content="Meta Recipe Title"></head><body></body></html>';

      const title = extractTitleFromHtml(html);

      expect(title).toBe("Meta Recipe Title");
    });

    it("should prefer H1 over meta title", () => {
      const html =
        '<html><head><meta itemprop="title" content="Meta Title"></head><body><h1>H1 Title</h1></body></html>';

      const title = extractTitleFromHtml(html);

      expect(title).toBe("H1 Title");
    });

    it("should handle empty H1 content", () => {
      const html = "<html><body><h1></h1><p>Content</p></body></html>";

      const title = extractTitleFromHtml(html);

      expect(title).toBeUndefined();
    });

    it("should handle whitespace-only H1 content", () => {
      const html = "<html><body><h1>   \n\t  </h1><p>Content</p></body></html>";

      const title = extractTitleFromHtml(html);

      expect(title).toBeUndefined();
    });

    it("should handle empty meta content", () => {
      const html =
        '<html><head><meta itemprop="title" content=""></head><body></body></html>';

      const title = extractTitleFromHtml(html);

      expect(title).toBeUndefined();
    });

    it("should handle whitespace-only meta content", () => {
      const html =
        '<html><head><meta itemprop="title" content="   \n\t  "></head><body></body></html>';

      const title = extractTitleFromHtml(html);

      expect(title).toBeUndefined();
    });

    it("should return undefined when no title found", () => {
      const html = "<html><body><p>No title here</p></body></html>";

      const title = extractTitleFromHtml(html);

      expect(title).toBeUndefined();
    });

    it("should handle case-insensitive matching", () => {
      const html = "<html><body><H1>Uppercase Title</H1></body></html>";

      const title = extractTitleFromHtml(html);

      expect(title).toBe("Uppercase Title");
    });

    it("should handle meta with different attribute order", () => {
      const html =
        '<html><head><meta itemprop="title" content="Different Order Title"></head><body></body></html>';

      const title = extractTitleFromHtml(html);

      expect(title).toBe("Different Order Title");
    });
  });

  describe("resolveTitle", () => {
    it("should use filename when available", () => {
      const data: NotePipelineData = {
        source: {
          filename: "recipe.html",
          url: "https://example.com/recipe",
        },
      } as NotePipelineData;
      const html = "<html><body><h1>HTML Title</h1></body></html>";

      const title = resolveTitle(data, html);

      expect(title).toBe("recipe.html");
    });

    it("should use URL when filename not available", () => {
      const data: NotePipelineData = {
        source: {
          url: "https://example.com/recipe",
        },
      } as NotePipelineData;
      const html = "<html><body><h1>HTML Title</h1></body></html>";

      const title = resolveTitle(data, html);

      expect(title).toBe("https://example.com/recipe");
    });

    it("should use HTML title when source title is Untitled", () => {
      const data: NotePipelineData = {
        source: {
          filename: "Untitled",
        },
      } as NotePipelineData;
      const html = "<html><body><h1>HTML Recipe Title</h1></body></html>";

      const title = resolveTitle(data, html);

      expect(title).toBe("HTML Recipe Title");
    });

    it("should use HTML title when source title is empty", () => {
      const data: NotePipelineData = {
        source: {
          filename: "",
        },
      } as NotePipelineData;
      const html = "<html><body><h1>HTML Recipe Title</h1></body></html>";

      const title = resolveTitle(data, html);

      expect(title).toBe("HTML Recipe Title");
    });

    it("should fallback to Untitled when no title available", () => {
      const data: NotePipelineData = {
        source: {},
      } as NotePipelineData;
      const html = "<html><body><p>No title here</p></body></html>";

      const title = resolveTitle(data, html);

      expect(title).toBe("Untitled");
    });

    it("should fallback to Untitled when source is null", () => {
      const data: NotePipelineData = {} as NotePipelineData;
      const html = "<html><body><p>No title here</p></body></html>";

      const title = resolveTitle(data, html);

      expect(title).toBe("Untitled");
    });

    it("should use filename over URL when both available", () => {
      const data: NotePipelineData = {
        source: {
          filename: "recipe.html",
          url: "https://example.com/recipe",
        },
      } as NotePipelineData;
      const html = "<html><body><h1>HTML Title</h1></body></html>";

      const title = resolveTitle(data, html);

      expect(title).toBe("recipe.html");
    });
  });

  describe("removeStyleTags", () => {
    it("should remove style tags and their content", () => {
      const content = `
        <html>
          <head>
            <style>
              body { color: red; }
              .title { font-size: 24px; }
            </style>
          </head>
          <body>
            <h1>Title</h1>
            <p>Content</p>
          </body>
        </html>
      `;

      const cleaned = removeStyleTags(content);

      expect(cleaned).not.toContain("<style>");
      expect(cleaned).not.toContain("body { color: red; }");
      expect(cleaned).not.toContain(".title { font-size: 24px; }");
      expect(cleaned).toContain("<h1>Title</h1>");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should remove multiple style tags", () => {
      const content = `
        <html>
          <head>
            <style>body { color: red; }</style>
            <style>.title { font-size: 24px; }</style>
          </head>
          <body>
            <h1>Title</h1>
          </body>
        </html>
      `;

      const cleaned = removeStyleTags(content);

      expect(cleaned).not.toContain("<style>");
      expect(cleaned).not.toContain("body { color: red; }");
      expect(cleaned).not.toContain(".title { font-size: 24px; }");
      expect(cleaned).toContain("<h1>Title</h1>");
    });

    it("should handle style tags with attributes", () => {
      const content =
        '<style type="text/css" media="screen">body { color: red; }</style><p>Content</p>';

      const cleaned = removeStyleTags(content);

      expect(cleaned).not.toContain("<style");
      expect(cleaned).not.toContain("body { color: red; }");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should handle case-insensitive style tags", () => {
      const content = "<STYLE>body { color: red; }</STYLE><p>Content</p>";

      const cleaned = removeStyleTags(content);

      expect(cleaned).not.toContain("<STYLE");
      expect(cleaned).not.toContain("body { color: red; }");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should handle mixed case style tags", () => {
      const content = "<Style>body { color: red; }</Style><p>Content</p>";

      const cleaned = removeStyleTags(content);

      expect(cleaned).not.toContain("<Style");
      expect(cleaned).not.toContain("body { color: red; }");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should return content unchanged when no style tags", () => {
      const content = "<html><body><h1>Title</h1><p>Content</p></body></html>";

      const cleaned = removeStyleTags(content);

      expect(cleaned).toBe(content);
    });

    it("should handle empty style tags", () => {
      const content = "<style></style><p>Content</p>";

      const cleaned = removeStyleTags(content);

      expect(cleaned).not.toContain("<style>");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should handle nested style tags", () => {
      const content =
        "<style><style>body { color: red; }</style></style><p>Content</p>";

      const cleaned = removeStyleTags(content);

      expect(cleaned).not.toContain("<style>");
      expect(cleaned).not.toContain("body { color: red; }");
      expect(cleaned).toContain("<p>Content</p>");
    });
  });

  describe("removeIconsTags", () => {
    it("should remove icons tags and their content", () => {
      const content = `
        <html>
          <head>
            <icons>
              <icon src="favicon.ico" />
              <icon src="apple-touch-icon.png" />
            </icons>
          </head>
          <body>
            <h1>Title</h1>
            <p>Content</p>
          </body>
        </html>
      `;

      const cleaned = removeIconsTags(content);

      expect(cleaned).not.toContain("<icons>");
      expect(cleaned).not.toContain("<icon src=");
      expect(cleaned).toContain("<h1>Title</h1>");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should remove multiple icons tags", () => {
      const content = `
        <html>
          <head>
            <icons><icon src="favicon.ico" /></icons>
            <icons><icon src="apple-touch-icon.png" /></icons>
          </head>
          <body>
            <h1>Title</h1>
          </body>
        </html>
      `;

      const cleaned = removeIconsTags(content);

      expect(cleaned).not.toContain("<icons>");
      expect(cleaned).not.toContain("<icon src=");
      expect(cleaned).toContain("<h1>Title</h1>");
    });

    it("should handle icons tags with attributes", () => {
      const content =
        '<icons class="favicons" id="main-icons"><icon src="favicon.ico" /></icons><p>Content</p>';

      const cleaned = removeIconsTags(content);

      expect(cleaned).not.toContain("<icons");
      expect(cleaned).not.toContain("<icon src=");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should handle case-insensitive icons tags", () => {
      const content = '<ICONS><icon src="favicon.ico" /></ICONS><p>Content</p>';

      const cleaned = removeIconsTags(content);

      expect(cleaned).not.toContain("<ICONS");
      expect(cleaned).not.toContain("<icon src=");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should handle mixed case icons tags", () => {
      const content = '<Icons><icon src="favicon.ico" /></Icons><p>Content</p>';

      const cleaned = removeIconsTags(content);

      expect(cleaned).not.toContain("<Icons");
      expect(cleaned).not.toContain("<icon src=");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should return content unchanged when no icons tags", () => {
      const content = "<html><body><h1>Title</h1><p>Content</p></body></html>";

      const cleaned = removeIconsTags(content);

      expect(cleaned).toBe(content);
    });

    it("should handle empty icons tags", () => {
      const content = "<icons></icons><p>Content</p>";

      const cleaned = removeIconsTags(content);

      expect(cleaned).not.toContain("<icons>");
      expect(cleaned).toContain("<p>Content</p>");
    });

    it("should handle nested icons tags", () => {
      const content =
        '<icons><icons><icon src="favicon.ico" /></icons></icons><p>Content</p>';

      const cleaned = removeIconsTags(content);

      expect(cleaned).not.toContain("<icons>");
      expect(cleaned).not.toContain("<icon src=");
      expect(cleaned).toContain("<p>Content</p>");
    });
  });

  describe("calculateRemovedSize", () => {
    it("should calculate size in KB when less than 1MB", () => {
      const originalLength = 10000;
      const cleanedLength = 5000;

      const sizeString = calculateRemovedSize(originalLength, cleanedLength);

      expect(sizeString).toBe("4.9KB");
    });

    it("should calculate size in MB when greater than 1MB", () => {
      const originalLength = 2 * 1024 * 1024; // 2MB
      const cleanedLength = 1024 * 1024; // 1MB

      const sizeString = calculateRemovedSize(originalLength, cleanedLength);

      expect(sizeString).toBe("1.00MB");
    });

    it("should handle exact 1MB boundary", () => {
      const originalLength = 1024 * 1024; // 1MB
      const cleanedLength = 0;

      const sizeString = calculateRemovedSize(originalLength, cleanedLength);

      expect(sizeString).toBe("1.00MB");
    });

    it("should handle zero removed content", () => {
      const originalLength = 1000;
      const cleanedLength = 1000;

      const sizeString = calculateRemovedSize(originalLength, cleanedLength);

      expect(sizeString).toBe("0.0KB");
    });

    it("should handle small removed content", () => {
      const originalLength = 100;
      const cleanedLength = 50;

      const sizeString = calculateRemovedSize(originalLength, cleanedLength);

      expect(sizeString).toBe("0.0KB");
    });

    it("should handle large removed content", () => {
      const originalLength = 10 * 1024 * 1024; // 10MB
      const cleanedLength = 5 * 1024 * 1024; // 5MB

      const sizeString = calculateRemovedSize(originalLength, cleanedLength);

      expect(sizeString).toBe("5.00MB");
    });

    it("should handle decimal precision for KB", () => {
      const originalLength = 1536; // 1.5KB
      const cleanedLength = 512; // 0.5KB

      const sizeString = calculateRemovedSize(originalLength, cleanedLength);

      expect(sizeString).toBe("1.0KB");
    });
  });

  describe("logCleaningStats", () => {
    it("should log cleaning statistics", () => {
      const mockLogger: StructuredLogger = {
        log: vi.fn(),
      };

      const title = "Test Recipe";
      const originalLength = 10000;
      const cleanedLength = 5000;
      const beforeStyleRemoval = 10000;
      const afterStyleRemoval = 8000;
      const beforeIconsRemoval = 8000;
      const afterIconsRemoval = 5000;

      logCleaningStats(
        mockLogger,
        title,
        originalLength,
        cleanedLength,
        beforeStyleRemoval,
        afterStyleRemoval,
        beforeIconsRemoval,
        afterIconsRemoval
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Style tags removed: 2000 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Icons tags removed: 3000 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "HTML cleaning completed: Test Recipe"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Total characters removed: 5000 (4.9KB)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith("Final content length: 5000");
    });

    it("should handle zero removed content", () => {
      const mockLogger: StructuredLogger = {
        log: vi.fn(),
      };

      const title = "Test Recipe";
      const originalLength = 1000;
      const cleanedLength = 1000;
      const beforeStyleRemoval = 1000;
      const afterStyleRemoval = 1000;
      const beforeIconsRemoval = 1000;
      const afterIconsRemoval = 1000;

      logCleaningStats(
        mockLogger,
        title,
        originalLength,
        cleanedLength,
        beforeStyleRemoval,
        afterStyleRemoval,
        beforeIconsRemoval,
        afterIconsRemoval
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Style tags removed: 0 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Icons tags removed: 0 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Total characters removed: 0 (0.0KB)"
      );
    });

    it("should handle large removed content in MB", () => {
      const mockLogger: StructuredLogger = {
        log: vi.fn(),
      };

      const title = "Large Recipe";
      const originalLength = 2 * 1024 * 1024; // 2MB
      const cleanedLength = 1024 * 1024; // 1MB
      const beforeStyleRemoval = 2 * 1024 * 1024;
      const afterStyleRemoval = 1.5 * 1024 * 1024;
      const beforeIconsRemoval = 1.5 * 1024 * 1024;
      const afterIconsRemoval = 1024 * 1024;

      logCleaningStats(
        mockLogger,
        title,
        originalLength,
        cleanedLength,
        beforeStyleRemoval,
        afterStyleRemoval,
        beforeIconsRemoval,
        afterIconsRemoval
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Style tags removed: 524288 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Icons tags removed: 524288 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Total characters removed: 1048576 (1.00MB)"
      );
    });

    it("should handle only style removal", () => {
      const mockLogger: StructuredLogger = {
        log: vi.fn(),
      };

      const title = "Style Only Recipe";
      const originalLength = 10000;
      const cleanedLength = 8000;
      const beforeStyleRemoval = 10000;
      const afterStyleRemoval = 8000;
      const beforeIconsRemoval = 8000;
      const afterIconsRemoval = 8000;

      logCleaningStats(
        mockLogger,
        title,
        originalLength,
        cleanedLength,
        beforeStyleRemoval,
        afterStyleRemoval,
        beforeIconsRemoval,
        afterIconsRemoval
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Style tags removed: 2000 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Icons tags removed: 0 characters"
      );
    });

    it("should handle only icons removal", () => {
      const mockLogger: StructuredLogger = {
        log: vi.fn(),
      };

      const title = "Icons Only Recipe";
      const originalLength = 10000;
      const cleanedLength = 8000;
      const beforeStyleRemoval = 10000;
      const afterStyleRemoval = 10000;
      const beforeIconsRemoval = 10000;
      const afterIconsRemoval = 8000;

      logCleaningStats(
        mockLogger,
        title,
        originalLength,
        cleanedLength,
        beforeStyleRemoval,
        afterStyleRemoval,
        beforeIconsRemoval,
        afterIconsRemoval
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Style tags removed: 0 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Icons tags removed: 2000 characters"
      );
    });
  });
});

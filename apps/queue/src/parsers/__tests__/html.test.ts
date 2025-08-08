import { beforeEach, describe, expect, it, vi } from "vitest";

import { HTML_PARSING_CONSTANTS } from "../constants";
import { parseHTMLContent } from "../html";

// Mock Cheerio
vi.mock("cheerio", () => ({
  load: vi.fn(),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  parseISO: vi.fn(),
}));

describe("HTML Parser", () => {
  let mockLoad: ReturnType<typeof vi.fn>;
  let mockParseISO: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const cheerioModule = await import("cheerio");
    mockLoad = vi.mocked(cheerioModule.load);

    const dateFnsModule = await import("date-fns");
    mockParseISO = vi.mocked(dateFnsModule.parseISO);
  });

  describe("parseHTMLContent", () => {
    it("should parse HTML content successfully", () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1></en-note></body></html>";
      const mockDate = new Date("2023-01-01T00:00:00.000Z");

      // Mock Cheerio setup
      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 1,
          text: vi.fn().mockReturnValue("Test Recipe"),
        }),
        find: vi.fn().mockReturnValue({
          length: 1,
          nextAll: vi.fn().mockReturnValue({
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(["1 cup flour", "2 eggs"]),
            }),
          }),
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_CREATED) {
          return { attr: vi.fn().mockReturnValue("2023-01-01T00:00:00.000Z") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_SOURCE) {
          return { attr: vi.fn().mockReturnValue("https://example.com") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TAG) {
          return {
            each: vi.fn().mockImplementation((callback) => {
              callback(0, { attr: vi.fn().mockReturnValue("tag1") });
              callback(1, { attr: vi.fn().mockReturnValue("tag2") });
            }),
          };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);
      mockParseISO.mockReturnValue(mockDate);

      const result = parseHTMLContent(mockHtml, {
        measurePerformance: false,
        logger: vi.fn(),
      });

      expect(result).toEqual({
        title: "Test Recipe",
        ingredients: expect.arrayContaining([
          expect.objectContaining({
            reference: expect.any(String),
            lineIndex: expect.any(Number),
            parseStatus: "AWAITING_PARSING",
          }),
        ]),
        instructions: [],
        contents: expect.any(String),
        evernoteMetadata: {
          originalCreatedAt: mockDate,
          source: "https://example.com",
          tags: undefined,
        },
      });
    });

    it("should throw error for empty content", () => {
      expect(() => parseHTMLContent("", { measurePerformance: false })).toThrow(
        HTML_PARSING_CONSTANTS.ERRORS.EMPTY_CONTENT
      );
    });

    it("should throw error for whitespace-only content", () => {
      expect(() =>
        parseHTMLContent("   \n\t   ", { measurePerformance: false })
      ).toThrow(HTML_PARSING_CONSTANTS.ERRORS.EMPTY_CONTENT);
    });

    it("should handle missing title gracefully", () => {
      const mockHtml = "<html><body><en-note></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 0,
        }),
        find: vi.fn().mockReturnValue({
          length: 0,
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue(null) };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      expect(() =>
        parseHTMLContent(mockHtml, { measurePerformance: false })
      ).toThrow(HTML_PARSING_CONSTANTS.ERRORS.NO_TITLE);
    });

    it("should handle invalid date gracefully", () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1></en-note></body></html>";
      const mockDate = new Date("invalid");

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 1,
          text: vi.fn().mockReturnValue("Test Recipe"),
        }),
        find: vi.fn().mockReturnValue({
          length: 1,
          nextAll: vi.fn().mockReturnValue({
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_CREATED) {
          return { attr: vi.fn().mockReturnValue("invalid-date") };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);
      mockParseISO.mockReturnValue(mockDate);

      expect(() =>
        parseHTMLContent(mockHtml, { measurePerformance: false })
      ).toThrow(HTML_PARSING_CONSTANTS.ERRORS.INVALID_DATE);
    });

    it("should handle parsing errors gracefully", () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1></en-note></body></html>";

      mockLoad.mockImplementation(() => {
        throw new Error("Cheerio load failed");
      });

      expect(() =>
        parseHTMLContent(mockHtml, { measurePerformance: false })
      ).toThrow("Cheerio load failed");
    });

    it("should handle performance measurement", () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 1,
          text: vi.fn().mockReturnValue("Test Recipe"),
        }),
        find: vi.fn().mockReturnValue({
          length: 1,
          nextAll: vi.fn().mockReturnValue({
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TAG) {
          return {
            each: vi.fn().mockImplementation((_callback) => {
              // Don't call callback for empty tags
            }),
          };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      const result = parseHTMLContent(mockHtml, {
        measurePerformance: true,
        logger: vi.fn(),
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Recipe");
    });

    it("should handle missing metadata gracefully", () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 1,
          text: vi.fn().mockReturnValue("Test Recipe"),
        }),
        find: vi.fn().mockReturnValue({
          length: 1,
          nextAll: vi.fn().mockReturnValue({
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TAG) {
          return {
            each: vi.fn().mockImplementation((_callback) => {
              // Don't call callback for empty tags
            }),
          };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      const result = parseHTMLContent(mockHtml, { measurePerformance: false });

      expect(result.evernoteMetadata).toEqual({
        originalCreatedAt: undefined,
        source: null,
        tags: undefined,
      });
    });

    it("should handle empty tags gracefully", async () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 1,
          text: vi.fn().mockReturnValue("Test Recipe"),
        }),
        find: vi.fn().mockReturnValue({
          length: 1,
          nextAll: vi.fn().mockReturnValue({
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TAG) {
          return {
            each: vi.fn().mockImplementation((_callback) => {
              _callback(0, { attr: vi.fn().mockReturnValue("") });
              _callback(1, { attr: vi.fn().mockReturnValue("   ") });
            }),
          };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      const result = parseHTMLContent(mockHtml, { measurePerformance: false });

      expect(result.evernoteMetadata?.tags).toBeUndefined();
    });

    it("should handle missing title and throw error", () => {
      const mockHtml = "<html><body><en-note></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 0,
        }),
        find: vi.fn().mockReturnValue({
          length: 0,
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue(null) };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      expect(() =>
        parseHTMLContent(mockHtml, { measurePerformance: false })
      ).toThrow(HTML_PARSING_CONSTANTS.ERRORS.NO_TITLE);
    });

    it("should handle tags with content and return them", () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockReturnValue({
          length: 1,
          text: vi.fn().mockReturnValue("Test Recipe"),
        }),
        find: vi.fn().mockReturnValue({
          length: 1,
          nextAll: vi.fn().mockReturnValue({
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      };

      // Mock the $ function to handle both selector calls and element calls
      mock$.mockImplementation((selector: string | any) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TAG) {
          return {
            each: vi.fn().mockImplementation((callback) => {
              callback(0, { attr: vi.fn().mockReturnValue("tag1") });
              callback(1, { attr: vi.fn().mockReturnValue("tag2") });
            }),
          };
        }
        // Handle element calls (when $ is called with an element)
        if (selector && typeof selector === 'object' && selector.attr) {
          return selector; // Return the element as-is
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      const result = parseHTMLContent(mockHtml, { measurePerformance: false });

      expect(result.evernoteMetadata?.tags).toEqual(["tag1", "tag2"]);
    });

    it("should handle content extraction without h1 tag", () => {
      const mockHtml =
        "<html><body><en-note><div>Content without h1</div></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockImplementation((selector) => {
          if (selector === HTML_PARSING_CONSTANTS.SELECTORS.H1) {
            return { length: 0 }; // No h1 found
          }
          return {
            length: 1,
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(["Content without h1"]),
            }),
          };
        }),
        find: vi.fn().mockReturnValue({
          length: 0, // No h1 found
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TAG) {
          return {
            each: vi.fn().mockImplementation((_callback) => {
              // Don't call callback for empty tags
            }),
          };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      const result = parseHTMLContent(mockHtml, { measurePerformance: false });

      expect(result.title).toBe("Meta Title");
    });

    it("should handle content extraction with h1 tag", () => {
      const mockHtml =
        "<html><body><en-note><h1>Test Recipe</h1><div>Content after h1</div></en-note></body></html>";

      const mock$ = vi.fn();
      const mockEnNote = {
        children: vi.fn().mockImplementation((selector) => {
          if (selector === HTML_PARSING_CONSTANTS.SELECTORS.H1) {
            return {
              length: 0, // No h1 found in children, so it will use meta title
            };
          }
          return {
            length: 1,
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(["Content after h1"]),
            }),
          };
        }),
        find: vi.fn().mockReturnValue({
          length: 1, // h1 found
          nextAll: vi.fn().mockReturnValue({
            map: vi.fn().mockReturnValue({
              get: vi.fn().mockReturnValue(["Content after h1"]),
            }),
          }),
        }),
      };

      mock$.mockImplementation((selector: string) => {
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE) {
          return mockEnNote;
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE) {
          return { attr: vi.fn().mockReturnValue("Meta Title") };
        }
        if (selector === HTML_PARSING_CONSTANTS.SELECTORS.META_TAG) {
          return {
            each: vi.fn().mockImplementation((_callback) => {
              // Don't call callback for empty tags
            }),
          };
        }
        return { attr: vi.fn().mockReturnValue(null) };
      });

      mockLoad.mockReturnValue(mock$);

      const result = parseHTMLContent(mockHtml, { measurePerformance: false });

      expect(result.title).toBe("Meta Title");
    });
  });
});

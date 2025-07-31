import { describe, expect, it } from "vitest";

import { parseHTMLContent } from "../../html";

describe("extractMetadata function", () => {
  describe("Date extraction", () => {
    it("should extract valid ISO date from meta tag", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="created" content="2023-01-01T00:00:00Z" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.originalCreatedAt).toEqual(
        new Date("2023-01-01T00:00:00Z")
      );
    });

    it("should handle missing date meta tag", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.originalCreatedAt).toBeUndefined();
    });

    it("should throw error for invalid date format", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="created" content="invalid-date" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      expect(() => parseHTMLContent(html)).toThrow(
        "Invalid date format in 'created' meta tag"
      );
    });

    it("should throw error for invalid date that parses but is invalid", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="created" content="2023-13-45T25:70:99Z" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      expect(() => parseHTMLContent(html)).toThrow(
        "Invalid date format in 'created' meta tag"
      );
    });
  });

  describe("Source URL extraction", () => {
    it("should extract source URL from meta tag", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="source-url" content="https://example.com/recipe" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.source).toBe("https://example.com/recipe");
    });

    it("should handle missing source URL meta tag", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.source).toBeUndefined();
    });

    it("should handle empty source URL", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="source-url" content="" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.source).toBe("");
    });
  });

  describe("Tags extraction", () => {
    it("should extract tags from meta tags", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="tag" content="recipe" />
            <meta itemprop="tag" content="cooking" />
            <meta itemprop="tag" content="dinner" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.tags).toEqual(["recipe", "cooking", "dinner"]);
    });

    it("should handle missing tags", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.tags).toBeUndefined();
    });

    it("should handle empty tags", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="tag" content="" />
            <meta itemprop="tag" content="   " />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.tags).toBeUndefined();
    });
  });

  describe("Combined metadata extraction", () => {
    it("should extract date, source URL, and tags", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="created" content="2023-01-01T00:00:00Z" />
            <meta itemprop="source-url" content="https://example.com/recipe" />
            <meta itemprop="tag" content="recipe" />
            <meta itemprop="tag" content="cooking" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.originalCreatedAt).toEqual(
        new Date("2023-01-01T00:00:00Z")
      );
      expect(result.evernoteMetadata?.source).toBe("https://example.com/recipe");
      expect(result.evernoteMetadata?.tags).toEqual(["recipe", "cooking"]);
    });

    it("should handle missing all metadata", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.evernoteMetadata?.originalCreatedAt).toBeUndefined();
      expect(result.evernoteMetadata?.source).toBeUndefined();
      expect(result.evernoteMetadata?.tags).toBeUndefined();
    });
  });
});

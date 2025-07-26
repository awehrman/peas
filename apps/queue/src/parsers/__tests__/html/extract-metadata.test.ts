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

      expect(result.historicalCreatedAt).toEqual(
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

      expect(result.historicalCreatedAt).toBeUndefined();
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

      expect(result.source).toBe("https://example.com/recipe");
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

      expect(result.source).toBeUndefined();
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

      expect(result.source).toBe("");
    });
  });

  describe("Combined metadata extraction", () => {
    it("should extract both date and source URL", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="created" content="2023-01-01T00:00:00Z" />
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

      expect(result.historicalCreatedAt).toEqual(
        new Date("2023-01-01T00:00:00Z")
      );
      expect(result.source).toBe("https://example.com/recipe");
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

      expect(result.historicalCreatedAt).toBeUndefined();
      expect(result.source).toBeUndefined();
    });
  });
});

import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("extractMetadata function", () => {
  it("should extract valid creation date", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
          <meta itemprop="created" content="2023-01-15T10:30:00Z" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.historicalCreatedAt).toEqual(
      new Date("2023-01-15T10:30:00Z")
    );
  });

  it("should extract source URL", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
          <meta itemprop="source-url" content="https://example.com/recipe" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.source).toBe("https://example.com/recipe");
  });

  it("should handle missing metadata gracefully", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.historicalCreatedAt).toBeUndefined();
    expect(result.source).toBeUndefined();
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
          </en-note>
        </body>
      </html>
    `;

    expect(() => parseHTML(html)).toThrow(
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
          </en-note>
        </body>
      </html>
    `;

    expect(() => parseHTML(html)).toThrow(
      "Invalid date format in 'created' meta tag"
    );
  });
});

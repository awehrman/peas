import { describe, it, expect, vi } from "vitest";
import { parseHTML } from "../../html";

describe("parseHTML - main function", () => {
  it("should parse valid HTML with all required elements", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
          <meta itemprop="created" content="2023-01-15T10:30:00Z" />
          <meta itemprop="source-url" content="https://example.com/recipe" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
            <br>
            <p>Step 1: Do something</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Test Recipe");
    expect(result.historicalCreatedAt).toEqual(
      new Date("2023-01-15T10:30:00Z")
    );
    expect(result.source).toBe("https://example.com/recipe");
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(1);
    expect(result.contents).toBe(
      "Ingredient 1\nIngredient 2\n\nStep 1: Do something\n"
    );
  });

  it("should handle performance measurement option", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Performance Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Performance Test Recipe</h1>
            <p>Flour</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html, { measurePerformance: true });

    expect(result.title).toBe("Performance Test Recipe");
    expect(result.ingredients).toHaveLength(1);
  });

  it("should use custom logger when provided", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Logger Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Logger Test Recipe</h1>
            <p>Flour</p>
          </en-note>
        </body>
      </html>
    `;

    const mockLogger = vi.fn();
    const result = parseHTML(html, { logger: mockLogger });

    expect(result.title).toBe("Logger Test Recipe");
    expect(mockLogger).toHaveBeenCalled();
  });

  it("should throw error for empty content", () => {
    expect(() => parseHTML("")).toThrow("HTML content is empty or invalid");
    expect(() => parseHTML("   ")).toThrow("HTML content is empty or invalid");
    expect(() => parseHTML("\n\t")).toThrow("HTML content is empty or invalid");
  });
});

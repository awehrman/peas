import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("edge cases and error handling", () => {
  it("should handle HTML with no en-note element", () => {
    const html = `
      <html>
        <body>
          <h1>Test Recipe</h1>
          <p>Content</p>
        </body>
      </html>
    `;

    expect(() => parseHTML(html)).toThrow("HTML file does not have a title");
  });

  it("should handle malformed HTML gracefully", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
            <p>Ingredient 1
            <p>Ingredient 2
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.title).toBe("Test Recipe");
    expect(result.ingredients.length).toBeGreaterThan(0);
  });

  it("should handle very large content", () => {
    const largeContent = "a".repeat(10000);
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Large Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Large Recipe</h1>
            <p>${largeContent}</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.title).toBe("Large Recipe");
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(1);
    expect(result.contents).toContain(largeContent);
  });

  it("should handle content with special characters", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Special Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Special Recipe</h1>
            <p>Ingredient with &amp; and &lt;tags&gt;</p>
            <br>
            <p>Step with &quot;quotes&quot; and &apos;apostrophes&apos;</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.title).toBe("Special Recipe");
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0]?.reference).toBe(
      "Ingredient with &amp; and &lt;tags&gt;"
    );
    expect(result.instructions[1]?.reference).toBe(
      "Step with \"quotes\" and 'apostrophes'"
    );
  });
});

import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("isInstructionLine function", () => {
  it("should identify lines surrounded by empty lines as instructions", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <br>
            <p>Mix ingredients thoroughly</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.instructions).toHaveLength(1);
  });

  it("should not identify lines with content before as instructions", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <p>Ingredient 1</p>
            <p>Mix ingredients thoroughly</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(2);
  });

  it("should not identify lines with content after as instructions", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <br>
            <p>Mix ingredients thoroughly</p>
            <p>Ingredient 1</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(2);
  });

  it("should handle first line as instruction when followed by empty line", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <p>Mix ingredients thoroughly</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.instructions).toHaveLength(1);
  });

  it("should handle last line as instruction when preceded by empty line", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <br>
            <p>Mix ingredients thoroughly</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.instructions).toHaveLength(1);
  });
});

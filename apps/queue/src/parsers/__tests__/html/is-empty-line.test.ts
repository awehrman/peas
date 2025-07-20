import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("isEmptyLine function", () => {
  it("should identify empty strings as empty lines", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(2);
  });

  it("should identify br tags as empty lines", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <p>Ingredient 1</p>
            <br>
            <p>Ingredient 2</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(2);
  });
});

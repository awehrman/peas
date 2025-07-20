import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("extractContent function", () => {
  it("should extract content after h1 when h1 is present", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe Title</h1>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
            <br>
            <p>Step 1</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.contents).toBe("Ingredient 1\nIngredient 2\n\nStep 1");
  });

  it("should extract all children when h1 is not present", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
        </head>
        <body>
          <en-note>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
            <br>
            <p>Step 1</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.contents).toBe("Ingredient 1\nIngredient 2\n\nStep 1");
  });
});

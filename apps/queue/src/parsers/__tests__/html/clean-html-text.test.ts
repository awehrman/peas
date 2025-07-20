import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("cleanHtmlText function", () => {
  it("should remove HTML tags and trim whitespace", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <p>  <strong>Bold</strong> ingredient  </p>
            <div><em>Italic</em> ingredient</div>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(2);
    expect(result.ingredients[0]?.reference).toBe("Bold ingredient");
    expect(result.ingredients[1]?.reference).toBe("Italic ingredient");
  });
});

import { describe, expect, it } from "vitest";

import { parseHTMLContent } from "../../html";

describe("cleanHtmlText function", () => {
  describe("HTML tag removal", () => {
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

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("Bold ingredient");
      expect(result.ingredients[1]?.reference).toBe("Italic ingredient");
    });

    it("should remove nested HTML tags", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p><strong><em>Bold and italic</em></strong> text</p>
              <div><span><a href="#">Link</a> text</span></div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("Bold and italic text");
      expect(result.ingredients[1]?.reference).toBe("Link text");
    });

    it("should handle self-closing tags", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p>Text with <br /> break</p>
              <div>Text with <hr /> rule</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(0);
    });

    it("should handle tags with attributes", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p><strong class="important" id="main">Bold</strong> text</p>
              <div><em style="color: red;">Italic</em> text</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("Bold text");
      expect(result.ingredients[1]?.reference).toBe("Italic text");
    });
  });

  describe("Whitespace handling", () => {
    it("should trim leading and trailing whitespace", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p>   Ingredient with spaces   </p>
              <div>  Another ingredient  </div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("Ingredient with spaces");
      expect(result.ingredients[1]?.reference).toBe("Another ingredient");
    });

    it("should preserve internal whitespace", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p>2   cups   flour</p>
              <div>1    cup    sugar</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("2   cups   flour");
      expect(result.ingredients[1]?.reference).toBe("1    cup    sugar");
    });

    it("should handle newlines and tabs", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p>Ingredient
              with
              newlines</p>
              <div>Ingredient	with	tabs</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe(
        "Ingredient\n              with\n              newlines"
      );
      expect(result.ingredients[1]?.reference).toBe("Ingredient	with	tabs");
    });
  });

  describe("Special characters", () => {
    it("should handle HTML entities", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p>2 &amp; 1/2 cups flour</p>
              <div>1/2 &lt; cup &gt; sugar</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("2 &amp; 1/2 cups flour");
      expect(result.ingredients[1]?.reference).toBe("1/2 &lt; cup &gt; sugar");
    });

    it("should handle special characters in text", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p>2 cups flour &amp; sugar</p>
              <div>1/2 cup butter (unsalted)</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("2 cups flour &amp; sugar");
      expect(result.ingredients[1]?.reference).toBe(
        "1/2 cup butter (unsalted)"
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty content", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p></p>
              <div>  </div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(0);
    });

    it("should handle content with only HTML tags", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p><strong></strong></p>
              <div><em><span></span></em></div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(0);
    });

    it("should handle malformed HTML", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe</h1>
              <p><strong>Bold text</p>
              <div>Unclosed <em>tag</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("Bold text");
      expect(result.ingredients[1]?.reference).toBe("Unclosed tag");
    });
  });
});

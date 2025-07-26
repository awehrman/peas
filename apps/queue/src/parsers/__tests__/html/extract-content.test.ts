import { describe, expect, it } from "vitest";

import { parseHTMLContent } from "../../html";

describe("extractContent function", () => {
  describe("Content extraction with h1 element", () => {
    it("should extract content after h1 element", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>First ingredient</p>
              <p>Second ingredient</p>
              <div>Third ingredient</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.contents).toContain("First ingredient");
      expect(result.contents).toContain("Second ingredient");
      expect(result.contents).toContain("Third ingredient");
      expect(result.contents).not.toContain("Recipe Title");
    });

    it("should handle content with mixed elements after h1", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient 1</p>
              <br />
              <div>Ingredient 2</div>
              <span>Ingredient 3</span>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.contents).toContain("Ingredient 1");
      expect(result.contents).toContain("Ingredient 2");
      expect(result.contents).toContain("Ingredient 3");
    });

    it("should handle empty content after h1", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.contents).toBe("");
      expect(result.ingredients).toHaveLength(0);
      expect(result.instructions).toHaveLength(0);
    });
  });

  describe("Content extraction without h1 element", () => {
    it("should extract all children when no h1 is present", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Recipe Title" />
          </head>
          <body>
            <en-note>
              <p>First ingredient</p>
              <p>Second ingredient</p>
              <div>Third ingredient</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.contents).toContain("First ingredient");
      expect(result.contents).toContain("Second ingredient");
      expect(result.contents).toContain("Third ingredient");
    });

    it("should handle nested elements", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Recipe Title" />
          </head>
          <body>
            <en-note>
              <div>
                <p>Nested ingredient</p>
                <span>Another ingredient</span>
              </div>
              <p>Direct ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.contents).toContain("Nested ingredient");
      expect(result.contents).toContain("Another ingredient");
      expect(result.contents).toContain("Direct ingredient");
    });
  });

  describe("Content structure", () => {
    it("should join content with line separator", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient 1</p>
              <p>Ingredient 2</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.contents).toContain("Ingredient 1");
      expect(result.contents).toContain("Ingredient 2");
      expect(result.contents).toContain("\n");
    });

    it("should handle content with special characters", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour &amp; sugar</p>
              <p>1/2 cup <strong>butter</strong></p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.contents).toContain("2 cups flour &amp; sugar");
      expect(result.contents).toContain("1/2 cup <strong>butter</strong>");
    });
  });
});

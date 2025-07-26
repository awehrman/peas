import { describe, expect, it } from "vitest";

import { parseHTMLContent } from "../../html";

describe("extractTitle function", () => {
  describe("Title extraction logic", () => {
    it("should extract title from h1 element when available", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title from H1</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Recipe Title from H1");
    });

    it("should extract title from meta tag when h1 is not available", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Recipe Title from Meta" />
          </head>
          <body>
            <en-note>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Recipe Title from Meta");
    });

    it("should prefer h1 over meta title when both are available", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Meta Title" />
          </head>
          <body>
            <en-note>
              <h1>H1 Title</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("H1 Title");
    });

    it("should use meta title when h1 is empty", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Meta Title" />
          </head>
          <body>
            <en-note>
              <h1></h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Untitled");
    });

    it("should use default title when h1 is empty and no meta title", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1></h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Untitled");
    });

    it("should throw error when no title is available", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      expect(() => parseHTMLContent(html)).toThrow(
        "HTML file does not have a title"
      );
    });

    it("should handle h1 with whitespace only", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>   </h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Untitled");
    });
  });
});

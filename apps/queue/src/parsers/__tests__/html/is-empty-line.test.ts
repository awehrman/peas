import { describe, expect, it } from "vitest";

import { parseHTMLContent } from "../../html";

describe("isEmptyLine function", () => {
  describe("Empty line detection", () => {
    it("should detect completely empty lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient</p>
              <p></p>
              <p>Another ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(0);
    });

    it("should detect lines with only whitespace", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient</p>
              <p>  </p>
              <p>Another ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("Ingredient");
      expect(result.ingredients[1]?.reference).toBe("Another ingredient");
    });

    it("should detect lines with only break tags", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient</p>
              <br />
              <p>Another ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(0);
    });

    it("should detect lines with break tags and content", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient</p>
              <p>Content<br />with break</p>
              <p>Another ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(0);
    });

    it("should not detect lines with content as empty", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient</p>
              <p>Not empty</p>
              <p>Another ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0]?.reference).toBe("Ingredient");
      expect(result.ingredients[1]?.reference).toBe("Not empty");
      expect(result.ingredients[2]?.reference).toBe("Another ingredient");
    });
  });

  describe("Break tag variations", () => {
    it("should detect self-closing break tags", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient</p>
              <br/>
              <p>Another ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(0);
    });

    it("should detect break tags with attributes", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Ingredient</p>
              <br style="clear: both;" />
              <p>Another ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(0);
    });
  });
});

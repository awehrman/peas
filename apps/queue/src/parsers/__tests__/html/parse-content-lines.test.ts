import { describe, expect, it } from "vitest";

import { parseHTMLContent } from "../../html";

describe("parseContentLines function", () => {
  describe("Ingredient parsing", () => {
    it("should parse ingredients from consecutive lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <p>1 cup sugar</p>
              <p>1/2 cup butter</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0]?.reference).toBe("2 cups flour");
      expect(result.ingredients[1]?.reference).toBe("1 cup sugar");
      expect(result.ingredients[2]?.reference).toBe("1/2 cup butter");
    });

    it("should group ingredients into blocks separated by empty lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <p>1 cup sugar</p>
              <br />
              <p>1/2 cup butter</p>
              <p>2 eggs</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(4);
      expect(result.ingredients[0]?.reference).toBe("2 cups flour");
      expect(result.ingredients[1]?.reference).toBe("1 cup sugar");
      expect(result.ingredients[2]?.reference).toBe("1/2 cup butter");
      expect(result.ingredients[3]?.reference).toBe("2 eggs");
    });

    it("should handle ingredients with HTML tags", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p><strong>2 cups</strong> flour</p>
              <p><em>1 cup</em> sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("2 cups flour");
      expect(result.ingredients[1]?.reference).toBe("1 cup sugar");
    });
  });

  describe("Instruction parsing", () => {
    it("should parse instructions surrounded by empty lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <br />
              <p>Mix all ingredients together in a large bowl</p>
              <br />
              <p>Bake at 350°F for 30 minutes</p>
              <br />
              <p>1 cup sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(3);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]?.reference).toBe("2 cups flour");
      expect(result.instructions[0]?.reference).toBe(
        "Mix all ingredients together in a large bowl"
      );
      expect(result.instructions[1]?.reference).toBe(
        "Bake at 350°F for 30 minutes"
      );
      expect(result.instructions[2]?.reference).toBe("1 cup sugar");
    });

    it("should not parse short lines as instructions", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <br />
              <p>Mix</p>
              <br />
              <p>Bake</p>
              <br />
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(0);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]?.reference).toBe("Mix");
      expect(result.ingredients[1]?.reference).toBe("Bake");
    });

    it("should handle instructions at the beginning and end", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>1 cup butter</p>
              <br />
              <p>2 cups flour</p>
              <p>1 cup sugar</p>
              <br />
              <p>Mix ingredients and bake for 30 minutes</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(1);
      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0]?.reference).toBe("1 cup butter");
      expect(result.ingredients[1]?.reference).toBe("2 cups flour");
      expect(result.ingredients[2]?.reference).toBe("1 cup sugar");
      expect(result.instructions[0]?.reference).toBe(
        "Mix ingredients and bake for 30 minutes"
      );
    });
  });

  describe("Mixed content parsing", () => {
    it("should correctly separate ingredients and instructions", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <p>1 cup sugar</p>
              <br />
              <p>Mix dry ingredients together</p>
              <br />
              <p>1/2 cup butter</p>
              <p>2 eggs</p>
              <br />
              <p>Add wet ingredients and mix well</p>
              <br />
              <p>Bake at 350°F for 30 minutes</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(4);
      expect(result.instructions).toHaveLength(3);
      expect(result.ingredients[0]?.reference).toBe("2 cups flour");
      expect(result.ingredients[1]?.reference).toBe("1 cup sugar");
      expect(result.ingredients[2]?.reference).toBe("1/2 cup butter");
      expect(result.ingredients[3]?.reference).toBe("2 eggs");
      expect(result.instructions[0]?.reference).toBe(
        "Mix dry ingredients together"
      );
      expect(result.instructions[1]?.reference).toBe(
        "Add wet ingredients and mix well"
      );
      expect(result.instructions[2]?.reference).toBe(
        "Bake at 350°F for 30 minutes"
      );
    });

    it("should handle empty lines and whitespace", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <p></p>
              <p>1 cup sugar</p>
              <br />
              <p>Mix ingredients together</p>
              <p>  </p>
              <p>Bake for 30 minutes</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(3);
      expect(result.instructions).toHaveLength(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle content with only empty lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <br />
              <p></p>
              <br />
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(0);
      expect(result.instructions).toHaveLength(0);
    });

    it("should handle content with only instructions", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <br />
              <p>1 cup butter</p>
              <br />
              <p>Second instruction</p>
              <br />
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(1);
      expect(result.instructions).toHaveLength(1);
      expect(result.ingredients[0]?.reference).toBe("1 cup butter");
      expect(result.instructions[0]?.reference).toBe("Second instruction");
    });

    it("should handle content with only ingredients", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>First ingredient</p>
              <p>Second ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(0);
    });
  });
});

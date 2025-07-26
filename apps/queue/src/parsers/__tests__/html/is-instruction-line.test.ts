import { describe, expect, it } from "vitest";

import { parseHTMLContent } from "../../html";

describe("isInstructionLine function", () => {
  describe("Instruction line detection", () => {
    it("should detect instruction line surrounded by empty lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <br />
              <p>Mix ingredients together</p>
              <br />
              <p>1 cup sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(3);
      expect(result.instructions[0]?.reference).toBe("2 cups flour");
      expect(result.instructions[1]?.reference).toBe(
        "Mix ingredients together"
      );
      expect(result.instructions[2]?.reference).toBe("1 cup sugar");
      expect(result.ingredients).toHaveLength(0);
    });

    it("should detect instruction line at the beginning", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>Preheat oven to 350°F</p>
              <br />
              <p>2 cups flour</p>
              <p>1 cup sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]?.reference).toBe("Preheat oven to 350°F");
    });

    it("should detect instruction line at the end", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <p>1 cup sugar</p>
              <br />
              <p>Bake for 30 minutes</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]?.reference).toBe("Bake for 30 minutes");
    });

    it("should not detect instruction line when surrounded by content", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <p>Mix ingredients</p>
              <p>1 cup sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(0);
      expect(result.ingredients).toHaveLength(3);
    });

    it("should not detect instruction line when only previous line is empty", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <br />
              <p>Mix ingredients</p>
              <p>1 cup sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(0);
      expect(result.ingredients).toHaveLength(2);
    });

    it("should not detect instruction line when only next line is empty", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <p>Mix ingredients</p>
              <br />
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(0);
      expect(result.ingredients).toHaveLength(2);
    });
  });

  describe("Multiple instruction lines", () => {
    it("should detect multiple instruction lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <br />
              <p>Mix dry ingredients together</p>
              <br />
              <p>Add wet ingredients and mix well</p>
              <br />
              <p>Bake at 350°F for 30 minutes</p>
              <br />
              <p>1 cup sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(5);
      expect(result.instructions[0]?.reference).toBe("2 cups flour");
      expect(result.instructions[1]?.reference).toBe(
        "Mix dry ingredients together"
      );
      expect(result.instructions[2]?.reference).toBe(
        "Add wet ingredients and mix well"
      );
      expect(result.instructions[3]?.reference).toBe(
        "Bake at 350°F for 30 minutes"
      );
      expect(result.instructions[4]?.reference).toBe("1 cup sugar");
    });

    it("should handle consecutive instruction lines", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <p>2 cups flour</p>
              <br />
              <p>Mix ingredients together</p>
              <br />
              <p>Bake immediately</p>
              <br />
              <p>1 cup sugar</p>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(4);
      expect(result.instructions[0]?.reference).toBe("2 cups flour");
      expect(result.instructions[1]?.reference).toBe(
        "Mix ingredients together"
      );
      expect(result.instructions[2]?.reference).toBe("Bake immediately");
      expect(result.instructions[3]?.reference).toBe("1 cup sugar");
    });
  });

  describe("Edge cases", () => {
    it("should handle instruction line with only one line of content", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <br />
              <p>Mix ingredients together</p>
              <br />
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]?.reference).toBe(
        "Mix ingredients together"
      );
    });

    it("should handle content with only instructions", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Recipe Title</h1>
              <br />
              <p>First instruction</p>
              <br />
              <p>Second instruction</p>
              <br />
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.instructions).toHaveLength(2);
      expect(result.ingredients).toHaveLength(0);
    });
  });
});

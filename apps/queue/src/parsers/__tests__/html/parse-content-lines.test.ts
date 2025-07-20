import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("parseContentLines function", () => {
  it("should parse multiple ingredient blocks", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
            <br>
            <p>Ingredient 3</p>
            <p>Ingredient 4</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(4);
    expect(result.ingredients[0]).toEqual({
      blockIndex: 0,
      lineIndex: 0,
      reference: "Ingredient 1",
      parseStatus: "PENDING",
    });
    expect(result.ingredients[1]).toEqual({
      blockIndex: 0,
      lineIndex: 1,
      reference: "Ingredient 2",
      parseStatus: "PENDING",
    });
    expect(result.ingredients[2]).toEqual({
      blockIndex: 1,
      lineIndex: 0,
      reference: "Ingredient 3",
      parseStatus: "PENDING",
    });
    expect(result.ingredients[3]).toEqual({
      blockIndex: 1,
      lineIndex: 1,
      reference: "Ingredient 4",
      parseStatus: "PENDING",
    });
  });

  it("should parse instructions when surrounded by empty lines", () => {
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
    expect(result.instructions[0]).toEqual({
      reference: "Mix ingredients thoroughly",
      lineIndex: 1,
      parseStatus: "PENDING",
    });
  });

  it("should treat short lines as ingredients when they don't qualify as instructions", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <br>
            <p>Mix</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0]).toEqual({
      blockIndex: 0,
      lineIndex: 0,
      reference: "Mix",
      parseStatus: "PENDING",
    });
  });

  it("should filter out lines that are too short", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe</h1>
            <p>a</p>
            <p>ab</p>
            <p>abc</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0]?.reference).toBe("abc");
  });

  it("should handle empty lines and br tags", () => {
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
    expect(result.instructions[0]?.reference).toBe("Ingredient 1");
    expect(result.instructions[1]?.reference).toBe("Ingredient 2");
  });

  it("should handle content ending without br tag", () => {
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
});

import { describe, it, expect } from "vitest";
import { parseHTML } from "../html";

// TODO i need to pull some more examples from evernote to properly test this
describe("parseHTML", () => {
  it("should parse valid HTML with all required elements", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
          <meta itemprop="created" content="2023-01-15T10:30:00Z" />
          <meta itemprop="source-url" content="https://example.com/recipe" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
            <br>
            <p>Step 1: Do something</p>
            <br>
            <p>Ingredient 3</p>
            <p>Ingredient 4</p>
            <br>
            <p>Step 2: Do something else</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Test Recipe");
    expect(result.historicalCreatedAt).toEqual(
      new Date("2023-01-15T10:30:00Z")
    );
    expect(result.source).toBe("https://example.com/recipe");
    expect(result.ingredients).toHaveLength(4);
    expect(result.instructions).toHaveLength(2);

    // Check ingredient structure
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

    // Check instruction structure
    expect(result.instructions[0]).toEqual({
      reference: "Step 1: Do something",
      lineIndex: 3,
      parseStatus: "PENDING",
    });
    expect(result.instructions[1]).toEqual({
      reference: "Step 2: Do something else",
      lineIndex: 8,
      parseStatus: "PENDING",
    });
  });

  it("should parse HTML with minimal required elements", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Simple Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Simple Recipe</h1>
            <p>Ingredient 1</p>
            <br>
            <p>Step 1: Do something</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Simple Recipe");
    expect(result.historicalCreatedAt).toBeUndefined();
    expect(result.source).toBeUndefined();
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(2);

    expect(result.instructions[0]).toEqual({
      reference: "Ingredient 1",
      lineIndex: 0,
      parseStatus: "PENDING",
    });

    expect(result.instructions[1]).toEqual({
      reference: "Step 1: Do something",
      lineIndex: 2,
      parseStatus: "PENDING",
    });
  });

  it("should handle content with multiple ingredients per block", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Multi Ingredient Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Multi Ingredient Recipe</h1>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
            <p>Ingredient 3</p>
            <br>
            <p>Step 1: Mix ingredients</p>
            <br>
            <p>Ingredient 4</p>
            <p>Ingredient 5</p>
            <br>
            <p>Step 2: Bake</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Multi Ingredient Recipe");
    expect(result.ingredients).toHaveLength(5);
    expect(result.instructions).toHaveLength(2);

    // First block: 3 ingredients
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
      blockIndex: 0,
      lineIndex: 2,
      reference: "Ingredient 3",
      parseStatus: "PENDING",
    });

    // Second block: 2 ingredients
    expect(result.ingredients[3]).toEqual({
      blockIndex: 1,
      lineIndex: 0,
      reference: "Ingredient 4",
      parseStatus: "PENDING",
    });
    expect(result.ingredients[4]).toEqual({
      blockIndex: 1,
      lineIndex: 1,
      reference: "Ingredient 5",
      parseStatus: "PENDING",
    });
  });

  // it("should handle content with multiple instructions", () => {
  //   const html = `
  //     <html>
  //       <head>
  //         <meta itemprop="title" content="Multi Step Recipe" />
  //       </head>
  //       <body>
  //         <en-note>
  //           <h1>Multi Step Recipe</h1>
  //           <p>Ingredient 1</p>
  //           <br>
  //           <p>Step 1: Mix</p>
  //           <br>
  //           <p>Ingredient 2</p>
  //           <br>
  //           <p>Step 2: Stir</p>
  //           <br>
  //           <p>Ingredient 3</p>
  //           <br>
  //           <p>Step 3: Bake</p>
  //           <br>
  //         </en-note>
  //       </body>
  //     </html>
  //   `;

  //   const result = parseHTML(html);

  //   expect(result.title).toBe("Multi Step Recipe");
  //   expect(result.ingredients).toHaveLength(3);
  //   expect(result.instructions).toHaveLength(3);

  //   expect(result.instructions[0]).toEqual({
  //     reference: "Step 1: Mix",
  //     lineIndex: 2,
  //     parseStatus: "PENDING",
  //   });
  //   expect(result.instructions[1]).toEqual({
  //     reference: "Step 2: Stir",
  //     lineIndex: 6,
  //     parseStatus: "PENDING",
  //   });
  //   expect(result.instructions[2]).toEqual({
  //     reference: "Step 3: Bake",
  //     lineIndex: 10,
  //     parseStatus: "PENDING",
  //   });
  // });

  // it("should handle content with empty lines and whitespace", () => {
  //   const html = `
  //     <html>
  //       <head>
  //         <meta itemprop="title" content="Test Recipe" />
  //       </head>
  //       <body>
  //         <en-note>
  //           <h1>Test Recipe</h1>
  //           <p>Ingredient 1</p>
  //           <p></p>
  //           <p>   </p>
  //           <br>
  //           <p>Step 1: Do something</p>
  //           <br>
  //         </en-note>
  //       </body>
  //     </html>
  //   `;

  //   const result = parseHTML(html);

  //   expect(result.title).toBe("Test Recipe");
  //   expect(result.ingredients).toHaveLength(1);
  //   expect(result.instructions).toHaveLength(1);

  //   expect(result.ingredients[0]).toEqual({
  //     blockIndex: 0,
  //     lineIndex: 0,
  //     reference: "Ingredient 1",
  //     parseStatus: "PENDING",
  //   });
  // });

  // it("should handle content with HTML entities", () => {
  //   const html = `
  //     <html>
  //       <head>
  //         <meta itemprop="title" content="Test Recipe" />
  //       </head>
  //       <body>
  //         <en-note>
  //           <h1>Test Recipe</h1>
  //           <p>1 cup flour &amp; 2 tbsp sugar</p>
  //           <br>
  //           <p>Mix ingredients &amp; bake at 350&deg;F</p>
  //           <br>
  //         </en-note>
  //       </body>
  //     </html>
  //   `;

  //   const result = parseHTML(html);

  //   expect(result.title).toBe("Test Recipe");
  //   expect(result.ingredients).toHaveLength(1);
  //   expect(result.instructions).toHaveLength(1);
  //   expect(result.ingredients[0]?.reference).toBe("1 cup flour & 2 tbsp sugar");
  //   expect(result.instructions[0]?.reference).toBe(
  //     "Mix ingredients & bake at 350°F"
  //   );
  // });

  it("should handle content with multiple consecutive br tags", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
            <p>Ingredient 1</p>
            <br>
            <br>
            <p>Step 1: Do something</p>
            <br>
            <br>
            <br>
            <p>Ingredient 2</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Test Recipe");
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(3);
  });

  it("should handle content with <br> tags and HTML elements", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
            <div>10 red capsicum (bell peppers)</div>
            <p>15 tomatoes, chopped</p>
            <span>1 Scotch bonnet or habanero chilli (pepper), or to taste</span>
            <br>
            <p>Blend capsicum, tomatoes, chilli, garlic and ginger together in a blender or food processer.</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Test Recipe");
    expect(result.ingredients).toHaveLength(3);
    expect(result.instructions).toHaveLength(1);

    // Check that HTML tags are stripped from ingredients
    expect(result.ingredients[0]).toEqual({
      blockIndex: 0,
      lineIndex: 0,
      reference: "10 red capsicum (bell peppers)",
      parseStatus: "PENDING",
    });
    expect(result.ingredients[1]).toEqual({
      blockIndex: 0,
      lineIndex: 1,
      reference: "15 tomatoes, chopped",
      parseStatus: "PENDING",
    });
    expect(result.ingredients[2]).toEqual({
      blockIndex: 0,
      lineIndex: 2,
      reference: "1 Scotch bonnet or habanero chilli (pepper), or to taste",
      parseStatus: "PENDING",
    });

    // Check that HTML tags are stripped from instructions
    expect(result.instructions[0]).toEqual({
      reference:
        "Blend capsicum, tomatoes, chilli, garlic and ginger together in a blender or food processer.",
      lineIndex: 4,
      parseStatus: "PENDING",
    });
  });

  it("should handle mixed content with <br> tags and empty lines", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Mixed Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Mixed Recipe</h1>
            <div>10 red peppers</div>
            <br>
            <p>orange</p>
            <span>apple</span>
            <br>
            <p>Preheat oven to 135.</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Mixed Recipe");
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(2);

    // First ingredient block: single ingredient
    expect(result.ingredients[0]).toEqual({
      blockIndex: 0,
      lineIndex: 0,
      reference: "orange",
      parseStatus: "PENDING",
    });

    // Second ingredient block: single ingredient
    expect(result.ingredients[1]).toEqual({
      blockIndex: 0,
      lineIndex: 1,
      reference: "apple",
      parseStatus: "PENDING",
    });

    // Instructions
    expect(result.instructions[0]).toEqual({
      reference: "10 red peppers",
      lineIndex: 0,
      parseStatus: "PENDING",
    });
    expect(result.instructions[1]).toEqual({
      reference: "Preheat oven to 135.",
      lineIndex: 5,
      parseStatus: "PENDING",
    });
  });

  it("should handle <br/> and <br /> variants", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="BR Variants Recipe" />
        </head>
        <body>
          <en-note>
            <h1>BR Variants Recipe</h1>
            <p>Ingredient 1</p>
            <br/>
            <p>Step 1: Do something</p>
            <br />
            <p>Ingredient 2</p>
            <p>Ingredient 3</p>
            <br/>
            <p>Step 2: Do something else</p>
            <br />
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("BR Variants Recipe");
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(3);

    // First ingredient block: single ingredient
    expect(result.ingredients[0]).toEqual({
      blockIndex: 0,
      lineIndex: 0,
      reference: "Ingredient 2",
      parseStatus: "PENDING",
    });

    // Second ingredient block: single ingredient
    expect(result.ingredients[1]).toEqual({
      blockIndex: 0,
      lineIndex: 1,
      reference: "Ingredient 3",
      parseStatus: "PENDING",
    });

    // Instructions
    expect(result.instructions[0]).toEqual({
      reference: "Ingredient 1",
      lineIndex: 0,
      parseStatus: "PENDING",
    });
    expect(result.instructions[1]).toEqual({
      reference: "Step 1: Do something",
      lineIndex: 2,
      parseStatus: "PENDING",
    });
    expect(result.instructions[2]).toEqual({
      reference: "Step 2: Do something else",
      lineIndex: 7,
      parseStatus: "PENDING",
    });
  });

  it("should filter out empty content after HTML tag removal", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Empty Content Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Empty Content Recipe</h1>
            <p>Ingredient 1</p>
            <div></div>
            <span>   </span>
            <br>
            <p>Step 1: Do something</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Empty Content Recipe");
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(2);

    // Only the non-empty content should be included
    expect(result.instructions[0]).toEqual({
      reference: "Ingredient 1",
      lineIndex: 0,
      parseStatus: "PENDING",
    });

    expect(result.instructions[1]).toEqual({
      reference: "Step 1: Do something",
      lineIndex: 4,
      parseStatus: "PENDING",
    });
  });

  // it("should handle content with complex HTML structure", () => {
  //   const html = `
  //     <html>
  //       <head>
  //         <meta itemprop="title" content="Test Recipe" />
  //         <meta itemprop="created" content="2023-01-15T10:30:00Z" />
  //         <meta itemprop="source-url" content="https://example.com/recipe" />
  //       </head>
  //       <body>
  //         <en-note>
  //           <h1>Test Recipe</h1>
  //           <div>
  //             <p>Ingredient 1</p>
  //             <span>Ingredient 2</span>
  //           </div>
  //           <br>
  //           <p>Step 1: Do something</p>
  //           <br>
  //           <ul>
  //             <li>Ingredient 3</li>
  //             <li>Ingredient 4</li>
  //           </ul>
  //           <br>
  //           <p>Step 2: Do something else</p>
  //           <br>
  //         </en-note>
  //       </body>
  //     </html>
  //   `;

  //   const result = parseHTML(html);

  //   expect(result.title).toBe("Test Recipe");
  //   expect(result.historicalCreatedAt).toEqual(
  //     new Date("2023-01-15T10:30:00Z")
  //   );
  //   expect(result.source).toBe("https://example.com/recipe");
  //   expect(result.ingredients).toHaveLength(4);
  //   expect(result.instructions).toHaveLength(2);
  // });

  it("should throw error when title is missing", () => {
    const html = `
      <html>
        <head>
        </head>
        <body>
          <en-note>
            <p>Ingredient 1</p>
            <br>
            <p>Step 1: Do something</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    expect(() => parseHTML(html)).toThrow("This file doesn't have a title!");
  });

  it("should throw error when created date is invalid", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
          <meta itemprop="created" content="invalid-date" />
        </head>
        <body>
          <en-note>
            <h1>Test Recipe</h1>
            <p>Ingredient 1</p>
            <br>
            <p>Step 1: Do something</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    expect(() => parseHTML(html)).toThrow(
      "Invalid date format in 'created' meta tag"
    );
  });

  it("should handle content with no h1 tag", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Test Recipe" />
        </head>
        <body>
          <en-note>
            <p>Ingredient 1</p>
            <br>
            <p>Step 1: Do something</p>
            <br>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Test Recipe");
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(2);
  });

  it("should handle content ending with ingredients", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Recipe Ending with Ingredients" />
        </head>
        <body>
          <en-note>
            <h1>Recipe Ending with Ingredients</h1>
            <p>Ingredient 1</p>
            <p>Ingredient 2</p>
            <br>
            <p>Step 1: Mix ingredients</p>
            <br>
            <p>Ingredient 3</p>
            <p>Ingredient 4</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    expect(result.title).toBe("Recipe Ending with Ingredients");
    expect(result.ingredients).toHaveLength(4);
    expect(result.instructions).toHaveLength(1);

    // First block: 2 ingredients
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

    // Second block: 2 ingredients (at the end, no <br> after)
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

    // Only one instruction
    expect(result.instructions[0]).toEqual({
      reference: "Step 1: Mix ingredients",
      lineIndex: 3,
      parseStatus: "PENDING",
    });
  });

  it("should handle empty content and return minimal structure", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Empty Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Empty Recipe</h1>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);

    // Test minimal structure with no ingredients or instructions
    expect(result.title).toBe("Empty Recipe");
    expect(result.historicalCreatedAt).toBeUndefined();
    expect(result.source).toBeUndefined();
    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(0);
    expect(result.contents).toBeDefined();
    expect(typeof result.contents).toBe("string");
    expect(result.contents).toBe("");
  });
});

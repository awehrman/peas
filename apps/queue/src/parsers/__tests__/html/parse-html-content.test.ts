import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseHTMLContent } from "../../html";

describe("parseHTMLContent", () => {
  const mockLogger = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should parse valid HTML content with title, ingredients, and instructions", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Beef Cheeks Recipe" />
            <meta itemprop="created" content="2023-01-01T00:00:00Z" />
            <meta itemprop="source-url" content="https://example.com" />
          </head>
          <body>
            <en-note>
              <h1>Beef Cheeks Recipe</h1>
              <div class="para">2 tbsp olive oil</div>
              <div class="para">4 beef cheeks (about 250gm each)</div>
              <div class="para">3 onions, halved, thinly sliced lengthways</div>
              <div class="para">3 garlic cloves, thinly sliced</div>
              <div class="para">2 fresh bay leaves</div>
              <div class="para">3 thyme sprigs</div>
              <div class="para">375 ml red wine</div>
              <div class="para">125 ml (½ cup) beef stock</div>
              <div class="para"><br></div>
              <div class="para">Preheat oven to 150C. Heat oil in a flameproof casserole large enough to fit beef cheeks snugly. Add cheeks, cook over high heat until browned (3-5 minutes each side), then transfer to a plate. Add onion and garlic to casserole and sauté over low heat until starting to caramelise (8-10 minutes). Return cheeks to casserole, add herbs, red wine and stock, season to taste, then bring to a simmer. Cover, transfer to oven and cook until beef cheeks are tender (3-3½ hours).</div>
              <div class="para"><br></div>
              <div class="para">Meanwhile, for creamed swede, place swede and enough water to cover in a large saucepan. Bring to the boil over high heat and cook until tender (25-30 minutes). Drain well, pulse in a food processor until smooth, return to saucepan, add cream and stir over medium heat until thick (1-2 minutes). Season to taste.</div>
              <div class="para"><br></div>
              <div class="para">Divide creamed swede among serving plates, top each with a beef cheek, spoon over braising liquid and serve immediately.</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Beef Cheeks Recipe");
      expect(result.evernoteMetadata?.originalCreatedAt).toEqual(
        new Date("2023-01-01T00:00:00Z")
      );
      expect(result.evernoteMetadata?.source).toBe("https://example.com");
      expect(result.ingredients).toHaveLength(8);
      expect(result.ingredients[0]?.reference).toBe("2 tbsp olive oil");
      expect(result.ingredients[1]?.reference).toBe(
        "4 beef cheeks (about 250gm each)"
      );
      expect(result.ingredients[2]?.reference).toBe(
        "3 onions, halved, thinly sliced lengthways"
      );
      expect(result.instructions).toHaveLength(3);
      expect(result.instructions[0]?.reference).toContain(
        "Preheat oven to 150C"
      );
      expect(result.instructions[1]?.reference).toContain(
        "Meanwhile, for creamed swede"
      );
      expect(result.instructions[2]?.reference).toContain(
        "Divide creamed swede among serving plates"
      );
      expect(result.contents).toContain("2 tbsp olive oil");
    });

    it("should use h1 title when meta title is not available", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Chocolate Cake Recipe</h1>
              <div class="para">2 cups flour</div>
              <div class="para">1 cup sugar</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Chocolate Cake Recipe");
    });

    it("should use meta title when h1 is not available", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Pasta Carbonara Recipe" />
          </head>
          <body>
            <en-note>
              <div class="para">400g spaghetti</div>
              <div class="para">4 egg yolks</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Pasta Carbonara Recipe");
    });

    it("should use default title when neither h1 nor meta title is available", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <div class="para">2 tbsp olive oil</div>
              <div class="para">1 onion, diced</div>
            </en-note>
          </body>
        </html>
      `;

      expect(() => parseHTMLContent(html)).toThrow(
        "HTML file does not have a title"
      );
    });
  });

  describe("Error handling", () => {
    it("should throw error for empty content", () => {
      expect(() => parseHTMLContent("")).toThrow(
        "HTML content is empty or invalid"
      );
      expect(() => parseHTMLContent("   ")).toThrow(
        "HTML content is empty or invalid"
      );
    });

    it("should throw error for invalid date format", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Test Recipe" />
            <meta itemprop="created" content="invalid-date" />
          </head>
          <body>
            <en-note>
              <h1>Test Recipe</h1>
              <p>Ingredient</p>
            </en-note>
          </body>
        </html>
      `;

      expect(() => parseHTMLContent(html)).toThrow(
        "Invalid date format in 'created' meta tag"
      );
    });

    it("should handle missing metadata gracefully", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Simple Salad Recipe</h1>
              <div class="para">2 cups mixed greens</div>
              <div class="para">1 cucumber, sliced</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.title).toBe("Simple Salad Recipe");
      expect(result.evernoteMetadata?.originalCreatedAt).toBeUndefined();
      expect(result.evernoteMetadata?.source).toBeUndefined();
    });
  });

  describe("Options handling", () => {
    it("should use custom logger when provided", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Quick Breakfast Recipe</h1>
              <div class="para">2 eggs</div>
              <div class="para">1 slice bread</div>
            </en-note>
          </body>
        </html>
      `;

      parseHTMLContent(html, { logger: mockLogger });

      expect(mockLogger).toHaveBeenCalled();
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining("Parsing HTML content")
      );
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining("HTML parsing completed")
      );
    });

    it("should handle performance measurement option", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Tea Recipe</h1>
              <div class="para">1 tea bag</div>
              <div class="para">1 cup hot water</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html, { measurePerformance: true });

      expect(result.title).toBe("Tea Recipe");
      expect(result.ingredients).toHaveLength(2);
    });
  });

  describe("Content parsing", () => {
    it("should parse ingredients and instructions correctly", () => {
      const html = `
        <html>
          <body>
            <en-note>
              <h1>Chocolate Chip Cookies</h1>
              <div class="para">2 cups flour</div>
              <div class="para">1 cup sugar</div>
              <div class="para">1 cup chocolate chips</div>
              <div class="para"><br></div>
              <div class="para">Preheat oven to 350°F. Mix flour and sugar in a large bowl. Add chocolate chips and stir until well combined. Drop spoonfuls onto baking sheet and bake for 12-15 minutes until golden brown.</div>
              <div class="para"><br></div>
              <div class="para">Let cookies cool on baking sheet for 5 minutes before transferring to wire rack.</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0]?.reference).toBe("2 cups flour");
      expect(result.ingredients[1]?.reference).toBe("1 cup sugar");
      expect(result.ingredients[2]?.reference).toBe("1 cup chocolate chips");
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions[0]?.reference).toContain(
        "Preheat oven to 350°F"
      );
      expect(result.instructions[1]?.reference).toContain("Let cookies cool");
    });

    it("should handle content without h1 element", () => {
      const html = `
        <html>
          <head>
            <meta itemprop="title" content="Smoothie Recipe" />
          </head>
          <body>
            <en-note>
              <div class="para">1 banana</div>
              <div class="para">1 cup strawberries</div>
              <div class="para">1 cup almond milk</div>
            </en-note>
          </body>
        </html>
      `;

      const result = parseHTMLContent(html);

      expect(result.ingredients).toHaveLength(3);
      expect(result.contents).toContain("1 banana");
      expect(result.contents).toContain("1 cup strawberries");
      expect(result.contents).toContain("1 cup almond milk");
    });
  });
});

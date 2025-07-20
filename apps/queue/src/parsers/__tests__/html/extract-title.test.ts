import { describe, it, expect } from "vitest";
import { parseHTML } from "../../html";

describe("extractTitle function", () => {
  it("should extract title from h1 tag when present", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>Recipe Title</h1>
            <p>Content</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.title).toBe("Recipe Title");
  });

  it("should return 'Untitled' when h1 is empty", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1></h1>
            <p>Content</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.title).toBe("Untitled");
  });

  it("should return 'Untitled' when h1 has only whitespace", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <h1>   </h1>
            <p>Content</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.title).toBe("Untitled");
  });

  it("should extract title from meta tag when h1 is not present", () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Meta Title" />
        </head>
        <body>
          <en-note>
            <p>Content</p>
          </en-note>
        </body>
      </html>
    `;

    const result = parseHTML(html);
    expect(result.title).toBe("Meta Title");
  });

  it("should throw error when no title is found", () => {
    const html = `
      <html>
        <body>
          <en-note>
            <p>Content</p>
          </en-note>
        </body>
      </html>
    `;

    expect(() => parseHTML(html)).toThrow("HTML file does not have a title");
  });
});

import { describe, it, expect, vi } from "vitest";
import { parseHTMLWithPerformance } from "../../html";

describe("parseHTMLWithPerformance function", () => {
  it("should parse HTML with performance measurement", async () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Async Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Async Test Recipe</h1>
            <p>Flour</p>
          </en-note>
        </body>
      </html>
    `;

    const result = await parseHTMLWithPerformance(html);

    expect(result.title).toBe("Async Test Recipe");
    expect(result.ingredients).toHaveLength(1);
  });

  it("should use custom logger when provided", async () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Logger Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Logger Test Recipe</h1>
            <p>Flour</p>
          </en-note>
        </body>
      </html>
    `;

    const mockLogger = vi.fn();
    const result = await parseHTMLWithPerformance(html, mockLogger);

    expect(result.title).toBe("Logger Test Recipe");
    expect(mockLogger).toHaveBeenCalled();
  });

  it("should handle synchronous result from parseHTML", async () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Sync Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Sync Test Recipe</h1>
            <p>Flour</p>
          </en-note>
        </body>
      </html>
    `;

    // This test ensures we cover the Promise.resolve(result) path
    // when parseHTML returns a synchronous result
    const result = await parseHTMLWithPerformance(html);

    expect(result.title).toBe("Sync Test Recipe");
    expect(result.ingredients).toHaveLength(1);
    expect(result).toBeInstanceOf(Object);
  });

  it("should handle synchronous result with logger", async () => {
    const html = `
      <html>
        <head>
          <meta itemprop="title" content="Sync Logger Test Recipe" />
        </head>
        <body>
          <en-note>
            <h1>Sync Logger Test Recipe</h1>
            <p>Flour</p>
          </en-note>
        </body>
      </html>
    `;

    const mockLogger = vi.fn();
    // This test ensures we cover the Promise.resolve(result) path
    // when parseHTML returns a synchronous result with a logger
    const result = await parseHTMLWithPerformance(html, mockLogger);

    expect(result.title).toBe("Sync Logger Test Recipe");
    expect(result.ingredients).toHaveLength(1);
    expect(mockLogger).toHaveBeenCalled();
  });
});

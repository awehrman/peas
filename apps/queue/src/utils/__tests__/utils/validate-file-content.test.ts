import { describe, it, expect } from "vitest";
import { validateFileContent } from "../../utils";

describe("validateFileContent", () => {
  it("should pass validation for non-empty content", () => {
    const content = "This is some valid content";
    const fileName = "test.html";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });

  it("should pass validation for content with only whitespace characters", () => {
    const content = "   \n\t   ";
    const fileName = "test.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: test.html"
    );
  });

  it("should throw error for empty string", () => {
    const content = "";
    const fileName = "empty.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: empty.html"
    );
  });

  it("should throw error for null content", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test edge case
    const content = null as any;
    const fileName = "null.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: null.html"
    );
  });

  it("should throw error for undefined content", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test edge case
    const content = undefined as any;
    const fileName = "undefined.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: undefined.html"
    );
  });

  it("should pass validation for content with only spaces", () => {
    const content = "   ";
    const fileName = "spaces.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: spaces.html"
    );
  });

  it("should pass validation for content with only tabs", () => {
    const content = "\t\t\t";
    const fileName = "tabs.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: tabs.html"
    );
  });

  it("should pass validation for content with only newlines", () => {
    const content = "\n\n\n";
    const fileName = "newlines.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: newlines.html"
    );
  });

  it("should pass validation for content with mixed whitespace", () => {
    const content = " \n\t \n";
    const fileName = "mixed-whitespace.html";

    expect(() => validateFileContent(content, fileName)).toThrow(
      "File is empty: mixed-whitespace.html"
    );
  });

  it("should pass validation for content with leading/trailing whitespace", () => {
    const content = "   valid content   ";
    const fileName = "whitespace-around.html";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });

  it("should pass validation for HTML content", () => {
    const content = "<html><body><h1>Hello World</h1></body></html>";
    const fileName = "index.html";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });

  it("should pass validation for JSON content", () => {
    const content = '{"key": "value", "number": 42}';
    const fileName = "data.json";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });

  it("should pass validation for XML content", () => {
    const content = '<?xml version="1.0"?><root><item>value</item></root>';
    const fileName = "data.xml";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });

  it("should pass validation for single character content", () => {
    const content = "a";
    const fileName = "single-char.html";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });

  it("should pass validation for content with special characters", () => {
    const content =
      "Content with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
    const fileName = "special-chars.html";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });

  it("should pass validation for content with unicode characters", () => {
    const content = "Content with unicode: ñáéíóú üöäëï";
    const fileName = "unicode.html";

    expect(() => validateFileContent(content, fileName)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";

import * as noteServices from "../../note";

describe("Note Services Index", () => {
  it("should export CleanHtmlAction", () => {
    expect(noteServices).toHaveProperty("CleanHtmlAction");
    expect(typeof noteServices.CleanHtmlAction).toBe("function");
  });

  it("should export cleanHtmlFile function", () => {
    expect(noteServices).toHaveProperty("cleanHtmlFile");
    expect(typeof noteServices.cleanHtmlFile).toBe("function");
  });

  it("should export ParseHtmlAction", () => {
    expect(noteServices).toHaveProperty("ParseHtmlAction");
    expect(typeof noteServices.ParseHtmlAction).toBe("function");
  });

  it("should export parseHtmlFile function", () => {
    expect(noteServices).toHaveProperty("parseHtmlFile");
    expect(typeof noteServices.parseHtmlFile).toBe("function");
  });

  it("should export registerNoteActions function", () => {
    expect(noteServices).toHaveProperty("registerNoteActions");
    expect(typeof noteServices.registerNoteActions).toBe("function");
  });

  it("should export all expected functions and classes", () => {
    const expectedExports = [
      "CleanHtmlAction",
      "cleanHtmlFile",
      "ParseHtmlAction",
      "parseHtmlFile",
      "registerNoteActions",
    ];

    expectedExports.forEach((exportName) => {
      expect(noteServices).toHaveProperty(exportName);
    });
  });
});

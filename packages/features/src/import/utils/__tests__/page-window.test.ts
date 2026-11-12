import { describe, expect, it } from "vitest";

import { getPageWindow } from "../page-window";

describe("getPageWindow", () => {
  it("returns nothing when there are no pages", () => {
    expect(getPageWindow(0, 0)).toEqual([]);
  });

  it("lists every page when there are only a few", () => {
    expect(getPageWindow(0, 1)).toEqual([0]);
    expect(getPageWindow(1, 3)).toEqual([0, 1, 2]);
  });

  it("collapses distant pages into ellipses around the current page", () => {
    expect(getPageWindow(10, 40)).toEqual([0, "ellipsis-start", 9, 10, 11, "ellipsis-end", 39]);
  });

  it("only shows the trailing ellipsis near the start", () => {
    expect(getPageWindow(0, 40)).toEqual([0, 1, "ellipsis-end", 39]);
  });

  it("only shows the leading ellipsis near the end", () => {
    expect(getPageWindow(39, 40)).toEqual([0, "ellipsis-start", 38, 39]);
  });
});

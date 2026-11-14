import { describe, expect, it } from "vitest";

import { NAVIGATION_CONSTANTS } from "../constants";
import {
  getNavigationItems,
  getToggleRestY,
  isNavigationEntryActive,
  isNavigationItemActive,
} from "../navigation";

const items = getNavigationItems({ isAdmin: true, canCurate: true });


describe("getNavigationItems", () => {
  it("shows Ingredients to everyone and the Knowledge section to curators", () => {
    const names = (canCurate: boolean) =>
      getNavigationItems({ isAdmin: false, canCurate }).map((item) => item.name);
    expect(names(false)).toEqual([
      "Dashboard",
      "Import",
      "Ingredients",
      "Recipes",
      "Notes",
    ]);
    expect(names(true)).toEqual([...names(false), "Knowledge"]);
  });

  it("lights Knowledge up on the review queue, concepts, and lexicon pages", () => {
    const knowledge = items.find((item) => item.name === "Knowledge");
    if (!knowledge) throw new Error("no Knowledge item");
    for (const path of ["/teach", "/teach/playground", "/concepts/abc", "/lexicon"])
      expect(isNavigationEntryActive(path, knowledge)).toBe(true);
    expect(isNavigationEntryActive("/ingredients", knowledge)).toBe(false);
  });
});

describe("isNavigationItemActive", () => {
  it("matches nested routes but only an exact match for the dashboard", () => {
    expect(isNavigationItemActive("/notes/abc", "/notes")).toBe(true);
    expect(isNavigationItemActive("/notes", "/")).toBe(false);
    expect(isNavigationItemActive("/", "/")).toBe(true);
    expect(isNavigationItemActive("/notesy", "/notes")).toBe(false);
  });
});

describe("getToggleRestY", () => {
  it("centers the toggle on the active page's row", () => {
    const notesIndex = items.findIndex((item) => item.href === "/notes");
    const rowCenter =
      NAVIGATION_CONSTANTS.NAV_LIST_TOP +
      notesIndex * NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT +
      NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT / 2;

    expect(getToggleRestY(items, "/notes/123")).toBe(rowCenter);
  });

  it("rests on the first row for the dashboard", () => {
    const firstRowCenter =
      NAVIGATION_CONSTANTS.NAV_LIST_TOP + NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT / 2;

    expect(getToggleRestY(items, "/")).toBe(firstRowCenter);
  });

  it("offsets the rest spot when the list starts lower", () => {
    const listTop =
      NAVIGATION_CONSTANTS.NAV_LIST_TOP + NAVIGATION_CONSTANTS.AVATAR_BLOCK_HEIGHT;

    expect(getToggleRestY(items, "/", listTop)).toBe(
      listTop + NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT / 2
    );
  });

  it("falls back to the default spot when no page is active", () => {
    expect(getToggleRestY(items, "/design")).toBe(NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y);
    expect(getToggleRestY(items, undefined)).toBe(NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y);
  });
});

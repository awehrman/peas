import { describe, expect, it } from "vitest";

import { normalizeUrl, parseHttpUrl, websiteDomain } from "../url.js";

describe("normalizeUrl", () => {
  it.each([
    ["HTTPS://Example.COM/Recipe", "https://example.com/Recipe"],
    ["https://example.com:443/a", "https://example.com/a"],
    ["http://example.com:80/a", "http://example.com/a"],
    ["http://example.com", "http://example.com/"],
    ["https://example.com/a#comments", "https://example.com/a"],
    ["https://example.com/a?utm_source=rss&utm_medium=x", "https://example.com/a"],
    ["https://example.com/a?id=4&fbclid=abc&gclid=1", "https://example.com/a?id=4"],
    ["https://example.com/a?UTM_Campaign=fall&page=2", "https://example.com/a?page=2"],
    ["https://user:pass@example.com/a", "https://example.com/a"],
    ["  https://example.com/a  ", "https://example.com/a"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it("keeps meaningful details that could change the page", () => {
    expect(normalizeUrl("https://example.com/a/")).toBe("https://example.com/a/");
    expect(normalizeUrl("https://www.example.com/a")).toBe("https://www.example.com/a");
    expect(normalizeUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(normalizeUrl("https://example.com/a?b=2&a=1")).toBe("https://example.com/a?b=2&a=1");
    expect(normalizeUrl("https://example.com:8443/a")).toBe("https://example.com:8443/a");
  });

  it("keeps the original encoding of the parameters it keeps", () => {
    expect(normalizeUrl("https://example.com/s?q=chili%20beans&utm_source=x")).toBe(
      "https://example.com/s?q=chili%20beans"
    );
    expect(normalizeUrl("https://example.com/s?q=a+b")).toBe("https://example.com/s?q=a+b");
  });

  it("rejects anything that is not an http(s) URL", () => {
    expect(normalizeUrl("The Joy of Cooking")).toBeNull();
    expect(normalizeUrl("evernote:///view/123")).toBeNull();
    expect(normalizeUrl("mailto:a@example.com")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
    expect(parseHttpUrl("ftp://example.com/a")).toBeNull();
  });
});

describe("websiteDomain", () => {
  it("drops www for grouping by website", () => {
    expect(websiteDomain("https://www.seriouseats.com/x")).toBe("seriouseats.com");
    expect(websiteDomain("not a url")).toBeNull();
  });
});

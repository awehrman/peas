import { MockAgent } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dnsLookup = vi.hoisted(() => vi.fn());
vi.mock("node:dns", () => ({ lookup: dnsLookup }));

import {
  URL_CHECK_LIMITS,
  UnsafeUrlError,
  assertSafeTarget,
  checkUrl,
  extractCanonicalUrl,
  isPublicAddress,
  safeLookup,
} from "../../source/url-check";

describe("isPublicAddress", () => {
  it.each([
    ["93.184.216.34", true],
    ["2606:4700::6810:84e5", true],
    ["127.0.0.1", false],
    ["10.1.2.3", false],
    ["172.16.0.9", false],
    ["192.168.1.1", false],
    ["169.254.169.254", false],
    ["100.64.0.1", false],
    ["0.0.0.0", false],
    ["224.0.0.1", false],
    ["::1", false],
    ["fd00:ec2::254", false],
    ["fe80::1", false],
    ["::ffff:127.0.0.1", false],
    ["::ffff:10.0.0.1", false],
    ["not-an-ip", false],
  ])("%s -> %s", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });
});

describe("assertSafeTarget", () => {
  it.each([
    "http://127.0.0.1/admin",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost/",
    "http://printer.local/",
    "http://metadata.google.internal/",
    "http://intranet/",
    "https://example.com:8443/",
    "http://user:pass@example.com/",
    "ftp://example.com/file",
  ])("refuses %s", (url) => {
    expect(() => assertSafeTarget(new URL(url))).toThrow(UnsafeUrlError);
  });

  it("allows public hosts on 80 and 443", () => {
    expect(() => assertSafeTarget(new URL("https://example.com/a"))).not.toThrow();
    expect(() => assertSafeTarget(new URL("http://93.184.216.34:80/"))).not.toThrow();
  });
});

type LookupCallback = (error: Error | null, addresses: { address: string; family: number }[]) => void;

/** Answers every lookup with these addresses, wherever the caller put its callback. */
function resolveTo(addresses: { address: string; family: number }[]) {
  dnsLookup.mockImplementation((...args: unknown[]) => {
    const callback = args.find((arg): arg is LookupCallback => typeof arg === "function");
    callback?.(null, addresses);
  });
}

describe("safeLookup", () => {
  beforeEach(() => dnsLookup.mockReset());

  it("refuses a hostname that resolves to any private address", async () => {
    resolveTo([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);
    const error = await new Promise<unknown>((resolve) =>
      safeLookup("rebind.example", { all: true }, (err) => resolve(err))
    );
    expect(error).toBeInstanceOf(UnsafeUrlError);
  });

  it("passes DNS errors through and refuses names that resolve to nothing", async () => {
    dnsLookup.mockImplementation((...args: unknown[]) => {
      const callback = args.find((arg): arg is (error: Error) => void => typeof arg === "function");
      callback?.(Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }));
    });
    const notFound = await new Promise<unknown>((resolve) => safeLookup("nope.example", 4, (err) => resolve(err)));
    expect((notFound as Error).message).toContain("ENOTFOUND");

    resolveTo([]);
    const empty = await new Promise<unknown>((resolve) => safeLookup("empty.example", undefined, (err) => resolve(err)));
    expect(empty).toBeInstanceOf(UnsafeUrlError);
  });

  it("answers in the shape the caller asked for", async () => {
    resolveTo([{ address: "93.184.216.34", family: 4 }]);
    const single = await new Promise<unknown[]>((resolve) =>
      safeLookup("example.com", { family: 0 }, (err, address, family) => resolve([err, address, family]))
    );
    expect(single).toEqual([null, "93.184.216.34", 4]);
    const all = await new Promise<unknown[]>((resolve) =>
      safeLookup("example.com", { all: true }, (err, addresses) => resolve([err, addresses]))
    );
    expect(all).toEqual([null, [{ address: "93.184.216.34", family: 4 }]]);
  });
});

describe("extractCanonicalUrl", () => {
  it("resolves the declared canonical URL against the page", () => {
    expect(
      extractCanonicalUrl('<head><link rel="canonical" href="/recipes/chili"></head>', "https://example.com/chili?ref=x")
    ).toBe("https://example.com/recipes/chili");
    expect(extractCanonicalUrl('<link rel="canonical" href="javascript:alert(1)">', "https://example.com/")).toBeNull();
    expect(extractCanonicalUrl("<p>none</p>", "https://example.com/")).toBeNull();
  });
});

describe("checkUrl", () => {
  let agent: MockAgent;

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
  });

  afterEach(async () => {
    await agent.close();
  });

  it("is REACHABLE on a 2xx HEAD", async () => {
    agent.get("https://example.com").intercept({ path: "/chili", method: "HEAD" }).reply(200, "");
    await expect(checkUrl("https://example.com/chili", agent)).resolves.toEqual({
      status: "REACHABLE",
      httpStatus: 200,
      finalUrl: "https://example.com/chili",
      canonicalUrl: null,
      failureReason: null,
    });
  });

  it("falls back to GET when HEAD is rejected, reading only the head for the canonical URL", async () => {
    const pool = agent.get("https://example.com");
    pool.intercept({ path: "/chili", method: "HEAD" }).reply(405, "");
    pool
      .intercept({ path: "/chili", method: "GET" })
      .reply(200, `<html><head><link rel="canonical" href="https://example.com/recipes/chili"></head><body>${"x".repeat(200_000)}</body></html>`, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    const outcome = await checkUrl("https://example.com/chili", agent);
    expect(outcome).toMatchObject({ status: "REACHABLE", httpStatus: 200, canonicalUrl: "https://example.com/recipes/chili" });
  });

  it("follows redirects and reports where it ended", async () => {
    const pool = agent.get("https://example.com");
    pool.intercept({ path: "/old", method: "HEAD" }).reply(301, "", { headers: { location: "/new" } });
    pool.intercept({ path: "/new", method: "HEAD" }).reply(200, "");
    await expect(checkUrl("https://example.com/old", agent)).resolves.toMatchObject({
      status: "REACHABLE",
      finalUrl: "https://example.com/new",
    });
  });

  it("refuses a redirect into a private network", async () => {
    agent
      .get("https://example.com")
      .intercept({ path: "/sneaky", method: "HEAD" })
      .reply(302, "", { headers: { location: "http://169.254.169.254/latest/meta-data/" } });
    await expect(checkUrl("https://example.com/sneaky", agent)).resolves.toMatchObject({
      status: "BLOCKED",
      httpStatus: 302,
      finalUrl: "http://169.254.169.254/latest/meta-data/",
    });
  });

  it("stops after too many redirects", async () => {
    const pool = agent.get("https://example.com");
    for (let hop = 0; hop <= URL_CHECK_LIMITS.maxRedirects; hop++) {
      pool.intercept({ path: `/r${hop}`, method: "HEAD" }).reply(302, "", { headers: { location: `/r${hop + 1}` } });
    }
    await expect(checkUrl("https://example.com/r0", agent)).resolves.toMatchObject({
      status: "UNREACHABLE",
      failureReason: "Too many redirects",
    });
  });

  it("is UNREACHABLE on 404 and on a network failure, never REACHABLE", async () => {
    const pool = agent.get("https://example.com");
    pool.intercept({ path: "/gone", method: "HEAD" }).reply(404, "");
    await expect(checkUrl("https://example.com/gone", agent)).resolves.toMatchObject({
      status: "UNREACHABLE",
      httpStatus: 404,
      failureReason: "HTTP 404",
    });

    pool.intercept({ path: "/down", method: "HEAD" }).replyWithError(new Error("connect ECONNREFUSED"));
    pool.intercept({ path: "/down", method: "GET" }).replyWithError(new Error("connect ECONNREFUSED"));
    await expect(checkUrl("https://example.com/down", agent)).resolves.toMatchObject({
      status: "UNREACHABLE",
      httpStatus: null,
    });
  });

  it("does not read non-HTML bodies, and reports error codes and refused connections", async () => {
    const pool = agent.get("https://example.com");
    pool.intercept({ path: "/photo.jpg", method: "HEAD" }).reply(405, "");
    pool.intercept({ path: "/photo.jpg", method: "GET" }).reply(200, "binary", { headers: { "content-type": "image/jpeg" } });
    await expect(checkUrl("https://example.com/photo.jpg", agent)).resolves.toMatchObject({
      status: "REACHABLE",
      canonicalUrl: null,
    });

    pool.intercept({ path: "/reset", method: "HEAD" }).reply(501, "");
    pool
      .intercept({ path: "/reset", method: "GET" })
      .replyWithError(Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }));
    await expect(checkUrl("https://example.com/reset", agent)).resolves.toMatchObject({
      status: "UNREACHABLE",
      failureReason: "socket hang up (ECONNRESET)",
    });

    const refused = Object.assign(new Error("connect refused"), { name: "UnsafeUrlError" });
    pool.intercept({ path: "/rebind", method: "HEAD" }).replyWithError(new Error("fetch failed", { cause: refused }));
    await expect(checkUrl("https://example.com/rebind", agent)).resolves.toMatchObject({ status: "BLOCKED" });
  });

  it("reads a large HTML page only up to the size limit", async () => {
    const pool = agent.get("https://example.com");
    pool.intercept({ path: "/big", method: "HEAD" }).reply(403, "");
    const chunk = `<html><head><link rel="canonical" href="/canonical"></head>${"x".repeat(URL_CHECK_LIMITS.maxBodyBytes * 2)}`;
    pool.intercept({ path: "/big", method: "GET" }).reply(200, chunk, { headers: { "content-type": "text/html" } });
    await expect(checkUrl("https://example.com/big", agent)).resolves.toMatchObject({
      status: "REACHABLE",
      canonicalUrl: "https://example.com/canonical",
    });
  });

  it("uses the shared safe agent by default, refusing private targets before connecting", async () => {
    await expect(checkUrl("http://10.0.0.1/")).resolves.toMatchObject({ status: "BLOCKED" });
  });

  it("blocks private targets before connecting", async () => {
    await expect(checkUrl("http://127.0.0.1:80/", agent)).resolves.toMatchObject({ status: "BLOCKED" });
    await expect(checkUrl("not a url", agent)).resolves.toMatchObject({ status: "UNREACHABLE" });
  });
});

import { parseBookReference } from "@peas/database";
import { describe, expect, it, vi } from "vitest";

import {
  OpenLibraryError,
  findBookCandidates,
  lookupIsbn,
  searchWorks,
  toCandidateInput,
} from "../../source/open-library";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const SALT = {
  key: "/works/OL17801197W",
  title: "Salt, Fat, Acid, Heat",
  author_name: ["Samin Nosrat"],
  first_publish_year: 2017,
  publisher: ["Simon & Schuster"],
  isbn: ["9781476753836", "1476753830"],
  edition_count: 12,
  cover_i: 8_000_000,
};

describe("searchWorks", () => {
  it("searches by title and author with an identifying User-Agent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ docs: [SALT] }));
    const docs = await searchWorks({ title: "Salt, Fat, Acid, Heat", author: "Samin Nosrat" }, fetchImpl);

    expect(docs).toEqual([SALT]);
    const [url, init] = fetchImpl.mock.calls[0]!;
    const params = new URL(url as string).searchParams;
    expect(params.get("title")).toBe("Salt, Fat, Acid, Heat");
    expect(params.get("author")).toBe("Samin Nosrat");
    expect(params.get("fields")).toContain("author_name");
    expect((init as { headers?: Record<string, string> }).headers).toMatchObject({ "User-Agent": expect.stringContaining("Peas") });
  });

  it("treats a missing search as no results, and works without publishers anywhere", async () => {
    const notFound = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    await expect(searchWorks({ title: "x", author: null }, notFound)).resolves.toEqual([]);

    const bare = vi.fn(async (url: string | URL) =>
      String(url).includes("/isbn/") ? jsonResponse({ key: "/books/OL1M" }) : jsonResponse({ docs: [{ key: "/works/W", title: "T" }] })
    );
    await expect(lookupIsbn("9781476753836", bare as unknown as typeof fetch)).resolves.toMatchObject({
      editionKey: "/books/OL1M",
      publishers: [],
    });
  });

  it("throws on provider errors so the lookup is marked ERROR", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    await expect(searchWorks({ title: "x", author: null }, fetchImpl)).rejects.toBeInstanceOf(OpenLibraryError);
  });
});

describe("default fetch", () => {
  it("uses the global fetch when none is injected", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ docs: [] }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(searchWorks({ title: "Plenty", author: null })).resolves.toEqual([]);
      await expect(lookupIsbn("9781476753836")).resolves.toBeNull();
      await expect(findBookCandidates(parseBookReference("Plenty"))).resolves.toEqual([]);
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("toCandidateInput", () => {
  it("fills missing fields with empty values", () => {
    expect(toCandidateInput({ key: "/works/W", title: "Untitled" })).toEqual({
      workKey: "/works/W",
      title: "Untitled",
      subtitle: null,
      authors: [],
      firstPublishYear: null,
      publishers: [],
      editionCount: null,
      coverId: null,
      isbns: [],
      editionKey: null,
      matchedIsbn: null,
    });
  });
});

describe("lookupIsbn", () => {
  it("returns null when Open Library does not know the ISBN, and falls back to the work's publishers", async () => {
    const unknown = vi.fn(async (url: string | URL) =>
      String(url).includes("/isbn/") ? new Response("", { status: 404 }) : jsonResponse({ docs: [] })
    );
    await expect(lookupIsbn("9780000000002", unknown as unknown as typeof fetch)).resolves.toBeNull();

    const noEdition = vi.fn(async (url: string | URL) =>
      String(url).includes("/isbn/") ? new Response("", { status: 404 }) : jsonResponse({ docs: [SALT] })
    );
    await expect(lookupIsbn("9781476753836", noEdition as unknown as typeof fetch)).resolves.toMatchObject({
      editionKey: null,
      publishers: ["Simon & Schuster"],
    });
  });
});

describe("findBookCandidates", () => {
  it("falls back to a title search when no ISBN resolves", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes("/isbn/")) return new Response("", { status: 404 });
      if (href.includes("q=isbn")) return jsonResponse({ docs: [] });
      return jsonResponse({ docs: [SALT] });
    });
    const candidates = await findBookCandidates(
      parseBookReference("Salt, Fat, Acid, Heat ISBN 9780000000002"),
      fetchImpl as unknown as typeof fetch
    );
    expect(candidates).toHaveLength(1);
  });

  it("uses the ISBN when the citation has one, keeping the edition it identifies", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes("/isbn/")) return jsonResponse({ key: "/books/OL26M", publishers: ["Simon & Schuster"] });
      return jsonResponse({ docs: [SALT] });
    });

    const candidates = await findBookCandidates(
      parseBookReference("Salt Fat Acid Heat, ISBN 978-1-4767-5383-6"),
      fetchImpl as unknown as typeof fetch
    );
    expect(candidates).toEqual([
      expect.objectContaining({
        workKey: "/works/OL17801197W",
        editionKey: "/books/OL26M",
        matchedIsbn: "9781476753836",
      }),
    ]);
  });

  it("retries without the author when the author narrows the search to nothing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ docs: [] }))
      .mockResolvedValueOnce(jsonResponse({ docs: [SALT] }));

    const candidates = await findBookCandidates(parseBookReference("Salt, Fat, Acid, Heat - Samin"), fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(new URL(fetchImpl.mock.calls[1]![0] as string).searchParams.get("author")).toBeNull();
    expect(candidates[0]).toMatchObject({ title: "Salt, Fat, Acid, Heat", matchedIsbn: null, editionKey: null });
  });
});

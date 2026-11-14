import type { BookCandidateInput, BookReference } from "@peas/database";

const OPEN_LIBRARY_URL = process.env.OPEN_LIBRARY_URL ?? "https://openlibrary.org";
const SEARCH_FIELDS =
  "key,title,subtitle,author_name,first_publish_year,publisher,isbn,edition_count,cover_i";
const SEARCH_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 10_000;

/** Open Library asks API clients to identify themselves. */
export const OPEN_LIBRARY_USER_AGENT =
  process.env.OPEN_LIBRARY_USER_AGENT ?? "Peas/1.0 (personal recipe library; cookbook source matching)";

/** One work from Open Library's search API (only the requested fields). */
export interface OpenLibraryDoc {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  isbn?: string[];
  edition_count?: number;
  cover_i?: number;
}

interface OpenLibraryEdition {
  key?: string;
  publishers?: string[];
  works?: { key: string }[];
}

/** Provider failures are thrown as this, so the job retries and the lookup is marked ERROR. */
export class OpenLibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenLibraryError";
  }
}

async function getJson<T>(path: string, fetchImpl: typeof fetch): Promise<T | null> {
  const response = await fetchImpl(`${OPEN_LIBRARY_URL}${path}`, {
    headers: { "User-Agent": OPEN_LIBRARY_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new OpenLibraryError(`Open Library answered ${response.status} for ${path}`);
  return (await response.json()) as T;
}

/** Maps a search doc to the shape the ranking takes. */
export function toCandidateInput(doc: OpenLibraryDoc): BookCandidateInput {
  return {
    workKey: doc.key,
    title: doc.title,
    subtitle: doc.subtitle ?? null,
    authors: doc.author_name ?? [],
    firstPublishYear: doc.first_publish_year ?? null,
    publishers: (doc.publisher ?? []).slice(0, 5),
    editionCount: doc.edition_count ?? null,
    coverId: doc.cover_i ?? null,
    isbns: (doc.isbn ?? []).slice(0, 25),
    editionKey: null,
    matchedIsbn: null,
  };
}

/**
 * Works matching a title (and author, when the citation names one).
 *
 * @example
 * await searchWorks({ title: "Salt, Fat, Acid, Heat", author: "Samin Nosrat" }) // [{ key: "/works/OL17801197W", ... }]
 */
export async function searchWorks(
  query: { title: string; author: string | null },
  fetchImpl: typeof fetch = fetch
): Promise<OpenLibraryDoc[]> {
  const params = new URLSearchParams({
    title: query.title,
    fields: SEARCH_FIELDS,
    limit: String(SEARCH_LIMIT),
  });
  if (query.author) params.set("author", query.author);
  const body = await getJson<{ docs?: OpenLibraryDoc[] }>(`/search.json?${params}`, fetchImpl);
  return body?.docs ?? [];
}

/**
 * The work for an ISBN, with the edition's key and publisher: the ISBN identifies the edition, so these may be stored.
 *
 * @example
 * await lookupIsbn("9780743246262") // { doc: { key: "/works/OL...W", ... }, editionKey: "/books/OL...M", publishers: ["Scribner"] }
 */
export async function lookupIsbn(
  isbn: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ doc: OpenLibraryDoc; editionKey: string | null; publishers: string[] } | null> {
  const params = new URLSearchParams({ q: `isbn:${isbn}`, fields: SEARCH_FIELDS, limit: "1" });
  const [search, edition] = await Promise.all([
    getJson<{ docs?: OpenLibraryDoc[] }>(`/search.json?${params}`, fetchImpl),
    getJson<OpenLibraryEdition>(`/isbn/${encodeURIComponent(isbn)}.json`, fetchImpl),
  ]);
  const doc = search?.docs?.[0];
  if (!doc) return null;
  return {
    doc,
    editionKey: edition?.key ?? null,
    publishers: edition?.publishers ?? doc.publisher ?? [],
  };
}

/**
 * Candidates for a parsed citation: through its ISBN when it has one, otherwise a title (plus author) search, retried without the author when that finds nothing.
 *
 * @example
 * await findBookCandidates(parseBookReference("Joy of Cooking by Rombauer")) // BookCandidateInput[]
 */
export async function findBookCandidates(
  reference: BookReference,
  fetchImpl: typeof fetch = fetch
): Promise<BookCandidateInput[]> {
  for (const isbn of reference.isbns) {
    const found = await lookupIsbn(isbn.isbn13, fetchImpl);
    if (found) {
      return [
        {
          ...toCandidateInput(found.doc),
          publishers: found.publishers.slice(0, 5),
          editionKey: found.editionKey,
          matchedIsbn: isbn.isbn10 ?? isbn.isbn13,
        },
      ];
    }
  }

  let docs = await searchWorks({ title: reference.title, author: reference.author }, fetchImpl);
  if (docs.length === 0 && reference.author) {
    docs = await searchWorks({ title: reference.title, author: null }, fetchImpl);
  }
  return docs.map(toCandidateInput);
}

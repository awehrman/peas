import type { BookLookupStatus, BookMatchStatus, Prisma } from "@prisma/client";

import { prisma } from "../client.js";
import {
  type BookCandidate,
  BookCandidatesSchema,
} from "../import-integrity/schemas.js";
import { OntologyError, parseOrThrow, toJson } from "./ontology/helpers.js";
import {
  bookSourceKey,
  moveSourceLinks,
  refreshPrimarySourcesForSource,
  textSourceKey,
} from "./source.js";

type Tx = Prisma.TransactionClient;

export interface BookLookupRecord {
  id: string;
  queryKey: string;
  query: string;
  status: BookLookupStatus;
  candidates: BookCandidate[];
  provider: string;
  fetchedAt: string | null;
  attempts: number;
  errorReason: string | null;
  noteCount: number;
  book: BookRecord | null;
}

export interface BookRecord {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  isbn10: string | null;
  isbn13: string | null;
  openLibraryWorkKey: string | null;
  coverId: number | null;
  matchStatus: BookMatchStatus;
}

const BOOK_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  authors: true,
  publisher: true,
  publishedYear: true,
  isbn10: true,
  isbn13: true,
  openLibraryWorkKey: true,
  coverId: true,
  matchStatus: true,
} as const;

type LookupRow = Prisma.BookLookupGetPayload<{
  include: { book: { select: typeof BOOK_SELECT } };
}>;

/** Notes citing the lookup's text: through its text source, or the matched book's source. */
async function countLookupNotes(lookup: { queryKey: string; bookId: string | null }): Promise<number> {
  const keys = [textSourceKey(lookup.queryKey)];
  if (lookup.bookId) keys.push(bookSourceKey(lookup.bookId));
  const rows = await prisma.noteSource.findMany({
    where: { source: { canonicalKey: { in: keys } } },
    select: { noteId: true },
    distinct: ["noteId"],
  });
  return rows.length;
}

async function toRecord(row: LookupRow): Promise<BookLookupRecord> {
  return {
    id: row.id,
    queryKey: row.queryKey,
    query: row.query,
    status: row.status,
    candidates: row.candidates
      ? parseOrThrow(BookCandidatesSchema, row.candidates, "BookLookup.candidates")
      : [],
    provider: row.provider,
    fetchedAt: row.fetchedAt?.toISOString() ?? null,
    attempts: row.attempts,
    errorReason: row.errorReason,
    noteCount: await countLookupNotes(row),
    book: row.book,
  };
}

export async function getBookLookup(id: string): Promise<BookLookupRecord | null> {
  const row = await prisma.bookLookup.findUnique({
    where: { id },
    include: { book: { select: BOOK_SELECT } },
  });
  return row ? toRecord(row) : null;
}

export interface BookLookupsPage {
  items: BookLookupRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Lookups by status, most cited first within a page of the newest. Review shows AMBIGUOUS, NO_MATCH, and ERROR.
 *
 * @example
 * await listBookLookups({ statuses: ["AMBIGUOUS", "NO_MATCH"], page: 1 })
 */
export async function listBookLookups({
  statuses,
  page = 1,
  pageSize = 25,
}: {
  statuses: BookLookupStatus[];
  page?: number;
  pageSize?: number;
}): Promise<BookLookupsPage> {
  const currentPage = Math.max(1, Math.floor(page));
  const where = { status: { in: statuses } };
  const [total, rows] = await Promise.all([
    prisma.bookLookup.count({ where }),
    prisma.bookLookup.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: { book: { select: BOOK_SELECT } },
    }),
  ]);
  return {
    total,
    page: currentPage,
    pageSize,
    items: await Promise.all(rows.map(toRecord)),
  };
}

/** Lookups still waiting for their first provider call, for the queue to (re)enqueue. */
export async function listPendingBookLookupIds(limit: number): Promise<string[]> {
  const rows = await prisma.bookLookup.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

/** Marks an attempt before calling the provider. Returns null when the lookup was already settled, so a duplicate job does nothing. */
export async function startBookLookup(
  id: string
): Promise<{ id: string; query: string; queryKey: string } | null> {
  const lookup = await prisma.bookLookup.findUnique({
    where: { id },
    select: { id: true, query: true, queryKey: true, status: true, attempts: true },
  });
  if (!lookup) return null;
  if (lookup.status !== "PENDING" && lookup.status !== "ERROR") return null;
  await prisma.bookLookup.update({
    where: { id },
    data: { attempts: lookup.attempts + 1 },
  });
  return { id: lookup.id, query: lookup.query, queryKey: lookup.queryKey };
}

export type BookLookupDecision =
  | { status: "MATCHED"; candidate: BookCandidate; reason: string }
  | { status: "AMBIGUOUS" }
  | { status: "NO_MATCH" };

/**
 * Stores ranked candidates and, for an automatic match, links the lookup's notes to the book. Returns the notes whose sources changed.
 *
 * @example
 * await recordBookLookupResult(id, ranked, { status: "AMBIGUOUS" }) // queued for review
 */
export async function recordBookLookupResult(
  id: string,
  candidates: BookCandidate[],
  decision: BookLookupDecision
): Promise<{ noteIds: string[] }> {
  const validated = parseOrThrow(BookCandidatesSchema, candidates, "BookLookup.candidates");
  return prisma.$transaction(async (tx) => {
    const lookup = await tx.bookLookup.update({
      where: { id },
      data: {
        candidates: toJson(validated),
        status: decision.status === "MATCHED" ? "MATCHED" : decision.status,
        fetchedAt: new Date(),
        errorReason: null,
      },
      select: { id: true, queryKey: true, query: true, bookId: true },
    });
    if (decision.status !== "MATCHED") return { noteIds: [] };
    return linkLookupToBook(tx, lookup, bookDataFromCandidate(decision.candidate), "AUTO_MATCHED", {
      provider: "openlibrary",
      reason: decision.reason,
      workKey: decision.candidate.workKey,
    });
  });
}

/** Records a provider failure. The lookup stays retryable and the import is unaffected. */
export async function recordBookLookupError(id: string, reason: string): Promise<void> {
  await prisma.bookLookup.update({
    where: { id },
    data: { status: "ERROR", errorReason: reason.slice(0, 500) },
  });
}

/** Puts a lookup back in the queue (the review page's Retry). */
export async function resetBookLookup(id: string): Promise<void> {
  await prisma.bookLookup.update({
    where: { id },
    data: { status: "PENDING", errorReason: null },
  });
}

interface BookData {
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  isbn10: string | null;
  isbn13: string | null;
  openLibraryWorkKey: string | null;
  openLibraryEditionKey: string | null;
  coverId: number | null;
}

/** Edition fields come only from an ISBN that identified the edition, never from the work's ISBN list. */
function bookDataFromCandidate(candidate: BookCandidate): BookData {
  const isbn = candidate.matchedIsbn;
  return {
    title: candidate.title,
    subtitle: candidate.subtitle,
    authors: candidate.authors,
    publisher: isbn ? (candidate.publishers[0] ?? null) : null,
    publishedYear: candidate.firstPublishYear,
    isbn13: isbn && isbn.length === 13 ? isbn : null,
    isbn10: isbn && isbn.length === 10 ? isbn : null,
    openLibraryWorkKey: candidate.workKey,
    openLibraryEditionKey: isbn ? candidate.editionKey : null,
    coverId: candidate.coverId,
  };
}

/**
 * Points a lookup at a book and merges the sources that cite it. The target book is the existing book with the same Open Library work, else the lookup's legacy unmatched book (enriched in place), else a new one. The lookup's text source, and any other source of a merged-away legacy book, have their note links moved to the book's source; a note already linked to both keeps one link. Emptied text sources are removed, since they only held identity.
 */
async function linkLookupToBook(
  tx: Tx,
  lookup: { id: string; queryKey: string; query: string; bookId: string | null },
  data: BookData,
  matchStatus: BookMatchStatus,
  provenance: Record<string, unknown>
): Promise<{ noteIds: string[] }> {
  const byWork = data.openLibraryWorkKey
    ? await tx.book.findUnique({
        where: { openLibraryWorkKey: data.openLibraryWorkKey },
        select: { id: true, matchStatus: true },
      })
    : null;
  const legacy =
    lookup.bookId && !byWork
      ? await tx.book.findFirst({
          where: { id: lookup.bookId, matchStatus: "UNMATCHED" },
          select: { id: true },
        })
      : null;

  const fields = {
    ...data,
    matchStatus,
    provenance: toJson({ ...provenance, matchedAt: new Date().toISOString() }),
  };
  // An existing work keeps its details; a reviewer's confirmation only upgrades an automatic match
  const book = byWork
    ? matchStatus === "CONFIRMED" && byWork.matchStatus === "AUTO_MATCHED"
      ? await tx.book.update({
          where: { id: byWork.id },
          data: { matchStatus: "CONFIRMED" },
          select: { id: true, matchStatus: true },
        })
      : byWork
    : legacy
      ? await tx.book.update({ where: { id: legacy.id }, data: fields, select: { id: true, matchStatus: true } })
      : await tx.book.create({
          data: { ...fields, originalTitle: lookup.query },
          select: { id: true, matchStatus: true },
        });

  const targetKey = bookSourceKey(book.id);
  let target = await tx.source.findUnique({ where: { canonicalKey: targetKey }, select: { id: true } });

  const mergeFrom = await tx.source.findMany({
    where: {
      OR: [
        { canonicalKey: textSourceKey(lookup.queryKey) },
        ...(lookup.bookId && lookup.bookId !== book.id ? [{ bookId: lookup.bookId }] : []),
      ],
      NOT: target ? { id: target.id } : undefined,
    },
    select: { id: true, canonicalKey: true },
  });

  if (!target) {
    const [first, ...rest] = mergeFrom;
    if (first) {
      // Convert the first citing source in place, keeping its links
      target = await tx.source.update({
        where: { id: first.id },
        data: { kind: "BOOK", bookId: book.id, canonicalKey: targetKey },
        select: { id: true },
      });
      mergeFrom.splice(0, mergeFrom.length, ...rest);
    } else {
      target = await tx.source.create({
        data: { kind: "BOOK", bookId: book.id, canonicalKey: targetKey },
        select: { id: true },
      });
    }
  }

  for (const source of mergeFrom) {
    await moveSourceLinks(tx, source.id, target.id);
    const remaining = await tx.noteSource.count({ where: { sourceId: source.id } });
    if (remaining === 0) await tx.source.delete({ where: { id: source.id } });
  }

  await tx.bookLookup.update({
    where: { id: lookup.id },
    data: { status: "MATCHED", bookId: book.id },
  });

  const noteIds = await refreshPrimarySourcesForSource(tx, target.id);
  return { noteIds };
}

async function requireLookup(tx: Tx, id: string) {
  const lookup = await tx.bookLookup.findUnique({
    where: { id },
    select: { id: true, queryKey: true, query: true, bookId: true, candidates: true },
  });
  if (!lookup) throw new OntologyError("Book lookup not found");
  return lookup;
}

/**
 * A reviewer picked one of the stored candidates (by Open Library work key).
 *
 * @example
 * await selectBookCandidate(lookupId, "/works/OL45883W")
 */
export async function selectBookCandidate(
  lookupId: string,
  workKey: string,
  userId: string | null = null
): Promise<{ noteIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    const lookup = await requireLookup(tx, lookupId);
    const candidates = lookup.candidates
      ? parseOrThrow(BookCandidatesSchema, lookup.candidates, "BookLookup.candidates")
      : [];
    const candidate = candidates.find((item) => item.workKey === workKey);
    if (!candidate) throw new OntologyError("That candidate is not part of this lookup");
    return linkLookupToBook(tx, lookup, bookDataFromCandidate(candidate), "CONFIRMED", {
      provider: "openlibrary",
      reason: "Selected by reviewer",
      workKey,
      userId,
    });
  });
}

export interface ManualBookInput {
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  isbn13: string | null;
  isbn10: string | null;
}

/**
 * A reviewer entered the book by hand (the provider had nothing, or the wrong thing).
 *
 * @example
 * await createBookManually(lookupId, { title: "Grandma's Binder", subtitle: null, authors: [], publisher: null, publishedYear: null, isbn13: null, isbn10: null })
 */
export async function createBookManually(
  lookupId: string,
  input: ManualBookInput,
  userId: string | null = null
): Promise<{ noteIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    const lookup = await requireLookup(tx, lookupId);
    return linkLookupToBook(
      tx,
      // A manual book never enriches a legacy row: it is the reviewer's record
      { ...lookup, bookId: null },
      {
        ...input,
        openLibraryWorkKey: null,
        openLibraryEditionKey: null,
        coverId: null,
      },
      "MANUAL",
      { reason: "Created by reviewer", userId }
    );
  });
}

/** The reviewer chose to leave the text as it is; its notes keep the text source. */
export async function leaveBookUnresolved(lookupId: string): Promise<void> {
  await prisma.bookLookup.update({
    where: { id: lookupId },
    data: { status: "LEFT_UNRESOLVED" },
  });
}

/** Review counts by status. */
export async function getBookLookupCounts(): Promise<Record<BookLookupStatus, number>> {
  const rows = await prisma.bookLookup.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<BookLookupStatus, number> = {
    PENDING: 0,
    MATCHED: 0,
    AMBIGUOUS: 0,
    NO_MATCH: 0,
    ERROR: 0,
    LEFT_UNRESOLVED: 0,
  };
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

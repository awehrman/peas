import type {
  BookLookupStatus,
  BookMatchStatus,
  NoteSourceOrigin,
  Prisma,
  SourceKind,
  UrlCheckStatus,
} from "@prisma/client";

import { prisma } from "../client.js";
import { normalizeSourceText } from "../import-integrity/content-hash.js";
import {
  type RankableSource,
  choosePrimarySource,
} from "../import-integrity/source-preference.js";
import {
  normalizeUrl,
  parseHttpUrl,
  websiteDomain,
} from "../import-integrity/url.js";
import { isUniqueViolation } from "./ontology/helpers.js";

type Tx = Prisma.TransactionClient;

/**
 * True when the source string is an http(s) URL. Anything else (a book title, "mom's recipe box") is treated as text.
 *
 * @example
 * isValidUrl("https://example.com/chili") // true
 * isValidUrl("Joy of Cooking")             // false
 */
export function isValidUrl(value: string): boolean {
  return parseHttpUrl(value) !== null;
}

/**
 * Host without "www.", used to group URLs by website.
 *
 * @example
 * extractDomainName("https://www.example.com/a") // "example.com"
 */
export function extractDomainName(url: string): string | null {
  return websiteDomain(url);
}

/** Canonical key for a book source. */
export function bookSourceKey(bookId: string): string {
  return `book:${bookId}`;
}

/** Canonical key for a text source. */
export function textSourceKey(queryKey: string): string {
  return `text:${queryKey}`;
}

export interface AttachedSource {
  sourceId: string;
  kind: SourceKind;
  /** Set for URL sources whose last check is missing or older than the recheck window. */
  urlIdToCheck: string | null;
  /** Set for text sources that still need a bibliographic lookup. */
  bookLookupIdToRun: string | null;
}

/** URLs checked more recently than this are not rechecked at import. */
export const URL_RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

async function findOrCreate<T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>
): Promise<T> {
  const existing = await find();
  if (existing) return existing;
  try {
    return await create();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await find();
    if (!raced) throw error;
    return raced;
  }
}

/**
 * Identity rows (sources, URLs, websites, lookups) are found or created outside the linking transaction: they are idempotent, and a unique-violation retry cannot run inside an aborted Postgres transaction.
 */
async function findOrCreateUrlSource(
  rawUrl: string,
  normalized: string
): Promise<{ id: string; urlId: string; lastCheckedAt: Date | null }> {
  const canonicalKey = `url:${normalized}`;
  const select = {
    id: true,
    url: { select: { id: true, lastCheckedAt: true } },
  } as const;

  const source = await findOrCreate(
    async () =>
      (await prisma.source.findUnique({ where: { canonicalKey }, select })) ??
      // Rows from before the backfill have no canonical key yet
      (await prisma.source.findFirst({
        where: {
          url: { OR: [{ normalizedUrl: normalized }, { originalUrl: rawUrl.trim() }] },
        },
        select,
      })),
    () =>
      prisma.source.create({
        data: { kind: "URL", canonicalKey, displayName: websiteDomain(rawUrl) },
        select,
      })
  );
  if (source.url) {
    return { id: source.id, urlId: source.url.id, lastCheckedAt: source.url.lastCheckedAt };
  }

  const domainName = websiteDomain(rawUrl);
  const website = domainName
    ? await prisma.website.upsert({
        where: { domainName },
        update: {},
        create: { domainName },
        select: { id: true },
      })
    : null;
  const url = await findOrCreate(
    () =>
      prisma.uRL.findUnique({
        where: { sourceId: source.id },
        select: { id: true, lastCheckedAt: true },
      }),
    () =>
      prisma.uRL.create({
        data: {
          sourceId: source.id,
          originalUrl: rawUrl.trim(),
          normalizedUrl: normalized,
          websiteId: website?.id ?? null,
        },
        select: { id: true, lastCheckedAt: true },
      })
  );
  return { id: source.id, urlId: url.id, lastCheckedAt: url.lastCheckedAt };
}

/** The source a matched book's notes link to, created on first use. */
export async function findOrCreateBookSource(bookId: string): Promise<string> {
  const canonicalKey = bookSourceKey(bookId);
  const source = await findOrCreate(
    () => prisma.source.findUnique({ where: { canonicalKey }, select: { id: true } }),
    () =>
      prisma.source.create({
        data: { kind: "BOOK", canonicalKey, bookId },
        select: { id: true },
      })
  );
  return source.id;
}

async function findOrCreateTextSource(
  rawText: string,
  queryKey: string
): Promise<{ sourceId: string; kind: SourceKind; bookLookupIdToRun: string | null }> {
  const lookup = await findOrCreate(
    () =>
      prisma.bookLookup.findUnique({
        where: { queryKey },
        select: { id: true, status: true, bookId: true },
      }),
    () =>
      prisma.bookLookup.create({
        data: { queryKey, query: rawText.trim() },
        select: { id: true, status: true, bookId: true },
      })
  );

  // A title already resolved to a book links straight to the book's source
  if (lookup.bookId && lookup.status === "MATCHED") {
    const sourceId = await findOrCreateBookSource(lookup.bookId);
    return { sourceId, kind: "BOOK", bookLookupIdToRun: null };
  }

  const canonicalKey = textSourceKey(queryKey);
  const source = await findOrCreate(
    () => prisma.source.findUnique({ where: { canonicalKey }, select: { id: true } }),
    () =>
      prisma.source.create({
        data: { kind: "OTHER", canonicalKey, displayName: rawText.trim() },
        select: { id: true },
      })
  );

  return {
    sourceId: source.id,
    kind: "OTHER",
    bookLookupIdToRun: lookup.status === "PENDING" ? lookup.id : null,
  };
}

/**
 * Links an imported source string to a note: a URL becomes (or reuses) a URL source keyed by its normalized form; any other text becomes a text source with one shared book lookup, or the book's source once that title has been matched. The original string is kept on the link, and the note's primary source is re-chosen. Returns null for blank input. Network work (URL checks, lookups) is left to the caller's background jobs.
 *
 * @example
 * await attachImportedSource(noteId, "https://Example.com/chili?utm_source=rss")
 * // { sourceId: "cm3s...", kind: "URL", urlIdToCheck: "cm3u...", bookLookupIdToRun: null }
 */
export async function attachImportedSource(
  noteId: string,
  rawText: string,
  origin: NoteSourceOrigin = "EVERNOTE_IMPORT"
): Promise<AttachedSource | null> {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const normalized = normalizeUrl(trimmed);
  const queryKey = normalized ? null : normalizeSourceText(trimmed);
  if (!normalized && !queryKey) return null;

  let attached: AttachedSource;
  if (normalized) {
    const source = await findOrCreateUrlSource(trimmed, normalized);
    const isStale =
      !source.lastCheckedAt ||
      Date.now() - source.lastCheckedAt.getTime() > URL_RECHECK_AFTER_MS;
    attached = {
      sourceId: source.id,
      kind: "URL",
      urlIdToCheck: isStale ? source.urlId : null,
      bookLookupIdToRun: null,
    };
  } else {
    const source = await findOrCreateTextSource(trimmed, queryKey as string);
    attached = { ...source, urlIdToCheck: null };
  }

  return prisma.$transaction(async (tx) => {
    await tx.noteSource.upsert({
      where: { noteId_sourceId: { noteId, sourceId: attached.sourceId } },
      update: {},
      create: { noteId, sourceId: attached.sourceId, originalText: trimmed, origin },
    });
    await refreshPrimarySource(tx, noteId);
    return attached;
  });
}

/** A note's linked sources in the shape the preference rules rank. */
export async function getRankableSources(
  tx: Tx,
  noteId: string
): Promise<(RankableSource & { noteSourceId: string; isPrimary: boolean })[]> {
  const rows = await tx.noteSource.findMany({
    where: { noteId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      isPrimary: true,
      source: {
        select: {
          id: true,
          kind: true,
          book: { select: { matchStatus: true } },
          url: { select: { checkStatus: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    noteSourceId: row.id,
    isPrimary: row.isPrimary,
    sourceId: row.source.id,
    kind: row.source.kind,
    bookMatchStatus: row.source.book?.matchStatus ?? null,
    urlCheckStatus: row.source.url?.checkStatus ?? null,
  }));
}

/**
 * Re-chooses a note's primary source with the preference rules (identified book, then book title, reachable URL, unchecked URL, failed URL, other text; ties keep the current one). Returns the change, or null when nothing changed.
 *
 * @example
 * await refreshPrimarySource(tx, noteId) // { from: "<url source>", to: "<book source>" }
 */
export async function refreshPrimarySource(
  tx: Tx,
  noteId: string
): Promise<{ from: string | null; to: string | null } | null> {
  const sources = await getRankableSources(tx, noteId);
  const current = sources.find((source) => source.isPrimary)?.sourceId ?? null;
  const chosen = choosePrimarySource(sources, current);
  if (chosen === current) return null;

  // Clear first: at most one primary per note is enforced by a partial unique index
  await tx.noteSource.updateMany({
    where: { noteId, isPrimary: true },
    data: { isPrimary: false },
  });
  if (chosen) {
    await tx.noteSource.updateMany({
      where: { noteId, sourceId: chosen },
      data: { isPrimary: true },
    });
  }
  return { from: current, to: chosen };
}

/** Moves every note link from one source to another; a note linked to both keeps the target link (and its primary flag). */
export async function moveSourceLinks(tx: Tx, fromId: string, toId: string): Promise<void> {
  const links = await tx.noteSource.findMany({
    where: { sourceId: fromId },
    select: { id: true, noteId: true, isPrimary: true, originalText: true },
  });
  for (const link of links) {
    const existing = await tx.noteSource.findUnique({
      where: { noteId_sourceId: { noteId: link.noteId, sourceId: toId } },
      select: { id: true, originalText: true },
    });
    if (existing) {
      if (!existing.originalText && link.originalText) {
        await tx.noteSource.update({
          where: { id: existing.id },
          data: { originalText: link.originalText },
        });
      }
      await tx.noteSource.delete({ where: { id: link.id } });
    } else {
      await tx.noteSource.update({ where: { id: link.id }, data: { sourceId: toId } });
    }
  }
}

/** Re-chooses the primary source of every note linked to a source, after its URL check or book match changed its rank. */
export async function refreshPrimarySourcesForSource(
  tx: Tx,
  sourceId: string
): Promise<string[]> {
  const links = await tx.noteSource.findMany({
    where: { sourceId },
    select: { noteId: true },
  });
  for (const link of links) await refreshPrimarySource(tx, link.noteId);
  return links.map((link) => link.noteId);
}

export interface SourceRecord {
  id: string;
  kind: SourceKind;
  displayName: string | null;
  url: {
    id: string;
    originalUrl: string;
    normalizedUrl: string | null;
    siteName: string | null;
    checkStatus: UrlCheckStatus;
    lastCheckedAt: string | null;
    lastSuccessfulVisitAt: string | null;
    lastHttpStatus: number | null;
    lastFailureReason: string | null;
    lastFinalUrl: string | null;
  } | null;
  book: {
    id: string;
    title: string;
    subtitle: string | null;
    authors: string[];
    publisher: string | null;
    publishedYear: number | null;
    isbn13: string | null;
    isbn10: string | null;
    coverId: number | null;
    matchStatus: BookMatchStatus;
    openLibraryWorkKey: string | null;
  } | null;
  /** For text sources: the shared bibliographic lookup and how it stands. */
  bookLookup: { id: string; status: BookLookupStatus } | null;
}

/** One note's link to a source. The link carries what differs per note (primary flag, original text); the source is shared. */
export interface NoteSourceRecord {
  /** The NoteSource id. */
  id: string;
  isPrimary: boolean;
  origin: NoteSourceOrigin;
  /** The source string as it appeared on this note. */
  originalText: string | null;
  source: SourceRecord;
}

/**
 * A note's sources, primary first, with URL check state, book details, and pending lookups.
 *
 * @example
 * await getNoteSources(noteId) // [{ isPrimary: true, source: { kind: "BOOK", book: { title: "Salt, Fat, Acid, Heat", ... } } }, { isPrimary: false, source: { kind: "URL", url: { checkStatus: "REACHABLE", ... } } }]
 */
export async function getNoteSources(noteId: string): Promise<NoteSourceRecord[]> {
  const rows = await prisma.noteSource.findMany({
    where: { noteId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: {
      source: {
        include: {
          url: { include: { website: { select: { siteName: true } } } },
          book: true,
        },
      },
    },
  });

  const textKeys = rows
    .map((row) => row.source.canonicalKey)
    .filter((key): key is string => Boolean(key?.startsWith("text:")))
    .map((key) => key.slice("text:".length));
  const lookups = textKeys.length
    ? await prisma.bookLookup.findMany({
        where: { queryKey: { in: textKeys } },
        select: { id: true, status: true, queryKey: true },
      })
    : [];
  const lookupByKey = new Map(lookups.map((lookup) => [lookup.queryKey, lookup]));

  return rows.map(({ source, ...link }) => {
    const textKey = source.canonicalKey?.startsWith("text:")
      ? source.canonicalKey.slice("text:".length)
      : null;
    const lookup = textKey ? lookupByKey.get(textKey) : undefined;
    return {
      id: link.id,
      isPrimary: link.isPrimary,
      origin: link.origin,
      originalText: link.originalText,
      source: {
      id: source.id,
      kind: source.kind,
      displayName: source.displayName,
      url: source.url
        ? {
            id: source.url.id,
            originalUrl: source.url.originalUrl,
            normalizedUrl: source.url.normalizedUrl,
            siteName: source.url.website?.siteName ?? null,
            checkStatus: source.url.checkStatus,
            lastCheckedAt: source.url.lastCheckedAt?.toISOString() ?? null,
            lastSuccessfulVisitAt: source.url.lastSuccessfulVisitAt?.toISOString() ?? null,
            lastHttpStatus: source.url.lastHttpStatus,
            lastFailureReason: source.url.lastFailureReason,
            lastFinalUrl: source.url.lastFinalUrl,
          }
        : null,
      book: source.book
        ? {
            id: source.book.id,
            title: source.book.title,
            subtitle: source.book.subtitle,
            authors: source.book.authors,
            publisher: source.book.publisher,
            publishedYear: source.book.publishedYear,
            isbn13: source.book.isbn13,
            isbn10: source.book.isbn10,
            coverId: source.book.coverId,
            matchStatus: source.book.matchStatus,
            openLibraryWorkKey: source.book.openLibraryWorkKey,
          }
        : null,
      bookLookup: lookup ? { id: lookup.id, status: lookup.status } : null,
      },
    };
  });
}

export interface FailedUrlCheckRecord {
  urlId: string;
  sourceId: string;
  originalUrl: string;
  checkStatus: UrlCheckStatus;
  lastCheckedAt: string | null;
  lastSuccessfulVisitAt: string | null;
  lastHttpStatus: number | null;
  lastFailureReason: string | null;
  consecutiveFailures: number;
  notes: { id: string; title: string | null }[];
}

/**
 * URLs whose last check failed or was refused, most recently checked first, with the notes citing them.
 *
 * @example
 * await listFailedUrlChecks({ page: 1 }) // { items: [{ originalUrl: "https://gone.example/x", lastHttpStatus: 404, ... }], total: 3 }
 */
export async function listFailedUrlChecks({
  page = 1,
  pageSize = 25,
}: { page?: number; pageSize?: number } = {}): Promise<{
  items: FailedUrlCheckRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const currentPage = Math.max(1, Math.floor(page));
  const where = { checkStatus: { in: ["UNREACHABLE", "BLOCKED"] as UrlCheckStatus[] } };
  const [total, rows] = await Promise.all([
    prisma.uRL.count({ where }),
    prisma.uRL.findMany({
      where,
      orderBy: [{ lastCheckedAt: "desc" }, { id: "asc" }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        source: {
          select: {
            noteSources: {
              take: 5,
              select: { note: { select: { id: true, title: true } } },
            },
          },
        },
      },
    }),
  ]);
  return {
    total,
    page: currentPage,
    pageSize,
    items: rows.map((row) => ({
      urlId: row.id,
      sourceId: row.sourceId,
      originalUrl: row.originalUrl,
      checkStatus: row.checkStatus,
      lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
      lastSuccessfulVisitAt: row.lastSuccessfulVisitAt?.toISOString() ?? null,
      lastHttpStatus: row.lastHttpStatus,
      lastFailureReason: row.lastFailureReason,
      consecutiveFailures: row.consecutiveFailures,
      notes: row.source.noteSources.map((link) => link.note),
    })),
  };
}

/**
 * Get note with EvernoteMetadata
 */
export async function getNoteWithEvernoteMetadata(noteId: string) {
  return prisma.note.findUnique({
    where: { id: noteId },
    include: {
      evernoteMetadata: true,
    },
  });
}

/**
 * Upsert EvernoteMetadata with source information
 */
export async function upsertEvernoteMetadataSource(
  evernoteMetadataId: string,
  sourceUrl: string
): Promise<void> {
  await prisma.evernoteMetadata.upsert({
    where: { id: evernoteMetadataId },
    update: { source: sourceUrl },
    create: {
      id: evernoteMetadataId,
      source: sourceUrl,
    },
  });
}

// ============================================================================
// URL CHECKS
// ============================================================================

export interface UrlCheckTarget {
  id: string;
  sourceId: string;
  originalUrl: string;
  normalizedUrl: string | null;
  lastCheckedAt: Date | null;
}

export async function getUrlCheckTarget(urlId: string): Promise<UrlCheckTarget | null> {
  return prisma.uRL.findUnique({
    where: { id: urlId },
    select: {
      id: true,
      sourceId: true,
      originalUrl: true,
      normalizedUrl: true,
      lastCheckedAt: true,
    },
  });
}

export interface UrlCheckOutcome {
  status: Exclude<UrlCheckStatus, "UNCHECKED">;
  httpStatus: number | null;
  finalUrl: string | null;
  canonicalUrl: string | null;
  failureReason: string | null;
  checkedAt?: Date;
}

/**
 * Stores a reachability check. Only a REACHABLE outcome (a 2xx after permitted redirects) moves lastSuccessfulVisitAt; failures count up and never delete the source. The primary source of every linked note is re-chosen, since reachability changes a URL's rank.
 *
 * @example
 * await recordUrlCheck(urlId, { status: "UNREACHABLE", httpStatus: 404, finalUrl: null, canonicalUrl: null, failureReason: "HTTP 404" })
 */
export async function recordUrlCheck(
  urlId: string,
  outcome: UrlCheckOutcome
): Promise<{ noteIds: string[] }> {
  const checkedAt = outcome.checkedAt ?? new Date();
  return prisma.$transaction(async (tx) => {
    const isReachable = outcome.status === "REACHABLE";
    const previous = await tx.uRL.findUniqueOrThrow({
      where: { id: urlId },
      select: { consecutiveFailures: true },
    });
    const url = await tx.uRL.update({
      where: { id: urlId },
      data: {
        checkStatus: outcome.status,
        lastCheckedAt: checkedAt,
        lastHttpStatus: outcome.httpStatus,
        lastFailureReason: isReachable ? null : outcome.failureReason,
        ...(outcome.finalUrl ? { lastFinalUrl: outcome.finalUrl } : {}),
        ...(outcome.canonicalUrl ? { canonicalUrl: outcome.canonicalUrl } : {}),
        ...(isReachable
          ? { lastSuccessfulVisitAt: checkedAt, consecutiveFailures: 0 }
          : { consecutiveFailures: previous.consecutiveFailures + 1 }),
      },
      select: { sourceId: true },
    });
    const noteIds = await refreshPrimarySourcesForSource(tx, url.sourceId);
    return { noteIds };
  });
}

/**
 * URLs never checked or last checked before the cutoff, oldest first, for the scheduled recheck.
 *
 * @example
 * await listUrlsDueForCheck({ checkedBefore: thirtyDaysAgo, limit: 500 }) // ["cm3u...", ...]
 */
export async function listUrlsDueForCheck({
  checkedBefore,
  limit,
}: {
  checkedBefore: Date;
  limit: number;
}): Promise<string[]> {
  const rows = await prisma.uRL.findMany({
    where: {
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: checkedBefore } }],
    },
    orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
    take: limit,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

import type { Prisma } from "@prisma/client";

import { prisma } from "../client.js";
import {
  computeContentHash,
  computeRawHtmlHash,
  normalizeSourceText,
} from "../import-integrity/content-hash.js";
import { padSimHash, simHashBands } from "../import-integrity/simhash.js";
import { normalizeUrl, websiteDomain } from "../import-integrity/url.js";
import { slugify, toJson } from "./ontology/helpers.js";
import { bookSourceKey, moveSourceLinks, refreshPrimarySource } from "./source.js";

export interface ImportIntegrityBackfillOptions {
  /** Count what would change without writing. */
  dryRun?: boolean;
  batchSize?: number;
  log?: (message: string) => void;
}

export interface ImportIntegrityBackfillReport {
  dryRun: boolean;
  urlsNormalized: number;
  urlsUnparseable: number;
  urlSourcesMerged: number;
  bookSourcesKeyed: number;
  bookLookupsCreated: number;
  categoriesSlugged: number;
  categoriesMerged: number;
  notesHashed: number;
  duplicateCandidatesCreated: number;
  primarySourcesChanged: number;
}

const DEFAULT_BATCH = 500;

/**
 * Fills the values the expand migration could not compute in SQL and merges identities that the new keys reveal as one: normalized URLs and canonical keys (URL sources that normalize alike are merged, note links moved, every original string kept), keys and pending lookups for legacy books, category slugs (case-only duplicates merged, memberships moved), padded title SimHashes with bands, raw and content hashes, duplicate candidates from old DUPLICATE notes, and primary sources by the preference rules. Idempotent: a second run changes nothing.
 *
 * @example
 * await backfillImportIntegrity({ dryRun: true }) // { urlsNormalized: 120, urlSourcesMerged: 3, ... }
 */
export async function backfillImportIntegrity(options: ImportIntegrityBackfillOptions = {}): Promise<ImportIntegrityBackfillReport> {
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? DEFAULT_BATCH;
  const log = options.log ?? (() => undefined);
  const report: ImportIntegrityBackfillReport = {
    dryRun,
    urlsNormalized: 0,
    urlsUnparseable: 0,
    urlSourcesMerged: 0,
    bookSourcesKeyed: 0,
    bookLookupsCreated: 0,
    categoriesSlugged: 0,
    categoriesMerged: 0,
    notesHashed: 0,
    duplicateCandidatesCreated: 0,
    primarySourcesChanged: 0,
  };

  await backfillUrlSources(report, dryRun, log);
  await backfillBookSources(report, dryRun, log);
  await backfillCategories(report, dryRun, log);
  await backfillNoteHashes(report, dryRun, batchSize, log);
  await backfillDuplicateCandidates(report, dryRun, log);
  await backfillPrimarySources(report, dryRun, batchSize, log);
  return report;
}

async function backfillUrlSources(report: ImportIntegrityBackfillReport, dryRun: boolean, log: (message: string) => void) {
  const urls = await prisma.uRL.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      sourceId: true,
      originalUrl: true,
      normalizedUrl: true,
      lastCheckedAt: true,
      lastSuccessfulVisitAt: true,
      source: { select: { canonicalKey: true, displayName: true } },
    },
  });

  const groups = new Map<string, typeof urls>();
  for (const url of urls) {
    // Legacy rows that are not http(s) URLs keep their original string as identity, so every URL has a key
    const normalized = normalizeUrl(url.originalUrl) ?? url.originalUrl.trim();
    if (!normalizeUrl(url.originalUrl)) report.urlsUnparseable++;
    const group = groups.get(normalized) ?? [];
    group.push(url);
    groups.set(normalized, group);
  }

  for (const [normalized, group] of groups) {
    const [keeper, ...duplicates] = group;
    if (!keeper) continue;
    const canonicalKey = `url:${normalized}`;
    const needsUpdate =
      keeper.normalizedUrl !== normalized || keeper.source.canonicalKey !== canonicalKey;
    if (needsUpdate) report.urlsNormalized++;
    report.urlSourcesMerged += duplicates.length;
    if (dryRun || (!needsUpdate && duplicates.length === 0)) continue;

    await prisma.$transaction(async (tx) => {
      // Another source may already hold the key (an import after the migration)
      const holder = await tx.source.findUnique({ where: { canonicalKey }, select: { id: true } });
      const target = holder && holder.id !== keeper.sourceId ? holder.id : keeper.sourceId;
      const merged = holder && holder.id !== keeper.sourceId ? [keeper, ...duplicates] : duplicates;

      for (const duplicate of merged) {
        await moveSourceLinks(tx, duplicate.sourceId, target);
        await tx.source.delete({ where: { id: duplicate.sourceId } });
      }
      if (target === keeper.sourceId) {
        const freshest = [keeper, ...duplicates].reduce((best, url) =>
          (url.lastSuccessfulVisitAt?.getTime() ?? 0) > (best.lastSuccessfulVisitAt?.getTime() ?? 0) ? url : best
        );
        await tx.uRL.update({
          where: { id: keeper.id },
          data: {
            normalizedUrl: normalized,
            ...(freshest.id !== keeper.id
              ? { lastSuccessfulVisitAt: freshest.lastSuccessfulVisitAt, lastCheckedAt: freshest.lastCheckedAt }
              : {}),
          },
        });
        await tx.source.update({
          where: { id: keeper.sourceId },
          data: {
            kind: "URL",
            canonicalKey,
            displayName: keeper.source.displayName ?? websiteDomain(keeper.originalUrl),
          },
        });
      }
    });
  }
  // Raw SQL: the column is required once the contract migration has run, so the client cannot filter on null
  const keyless = await prisma.$queryRaw<{ id: string }[]>`
    SELECT source.id FROM "Source" source
    WHERE source."canonicalKey" IS NULL AND source."bookId" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "URL" url WHERE url."sourceId" = source.id)
  `;
  report.urlsNormalized += keyless.length;
  if (!dryRun) {
    for (const source of keyless) {
      await prisma.source.update({ where: { id: source.id }, data: { canonicalKey: `legacy:${source.id}` } });
    }
  }
  log(`URLs: ${report.urlsNormalized} keyed, ${report.urlSourcesMerged} merged, ${report.urlsUnparseable} not http(s)`);
}

async function backfillBookSources(report: ImportIntegrityBackfillReport, dryRun: boolean, log: (message: string) => void) {
  const sources = await prisma.$queryRaw<{ id: string; bookId: string }[]>`
    SELECT id, "bookId" FROM "Source"
    WHERE "bookId" IS NOT NULL AND "canonicalKey" IS NULL
    ORDER BY "createdAt", id
  `;
  for (const source of sources) {
    const bookId = source.bookId;
    report.bookSourcesKeyed++;
    if (dryRun) continue;
    await prisma.$transaction(async (tx) => {
      const holder = await tx.source.findUnique({
        where: { canonicalKey: bookSourceKey(bookId) },
        select: { id: true },
      });
      if (holder) {
        await moveSourceLinks(tx, source.id, holder.id);
        await tx.source.delete({ where: { id: source.id } });
      } else {
        await tx.source.update({
          where: { id: source.id },
          data: { kind: "BOOK", canonicalKey: bookSourceKey(bookId) },
        });
      }
    });
  }

  const books = await prisma.book.findMany({
    where: { matchStatus: "UNMATCHED", lookups: { none: {} } },
    select: { id: true, title: true, originalTitle: true },
  });
  for (const book of books) {
    const query = book.originalTitle ?? book.title;
    const queryKey = normalizeSourceText(query);
    if (!queryKey) continue;
    const existing = await prisma.bookLookup.findUnique({ where: { queryKey }, select: { id: true } });
    if (existing) continue;
    report.bookLookupsCreated++;
    if (dryRun) continue;
    await prisma.bookLookup.create({ data: { queryKey, query, bookId: book.id } });
  }
  log(`Books: ${report.bookSourcesKeyed} sources keyed, ${report.bookLookupsCreated} lookups queued`);
}

const STATE_STRENGTH = { INFERRED: 0, APPROVED: 1, EXCLUDED: 2 } as const;

async function backfillCategories(report: ImportIntegrityBackfillReport, dryRun: boolean, log: (message: string) => void) {
  const categories = await prisma.category.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true },
  });
  const bySlug = new Map<string, typeof categories>();
  for (const category of categories) {
    const slug = category.slug ?? slugify(category.name);
    const group = bySlug.get(slug) ?? [];
    group.push(category);
    bySlug.set(slug, group);
  }

  for (const [slug, group] of bySlug) {
    const [keeper, ...duplicates] = group;
    if (!keeper) continue;
    if (keeper.slug !== slug) report.categoriesSlugged++;
    report.categoriesMerged += duplicates.length;
    if (dryRun || (keeper.slug === slug && duplicates.length === 0)) continue;

    await prisma.$transaction(async (tx) => {
      for (const duplicate of duplicates) {
        const memberships = await tx.noteCategory.findMany({ where: { categoryId: duplicate.id } });
        for (const membership of memberships) {
          const existing = await tx.noteCategory.findUnique({
            where: { noteId_categoryId: { noteId: membership.noteId, categoryId: keeper.id } },
            select: { id: true, state: true },
          });
          if (!existing) {
            await tx.noteCategory.update({ where: { id: membership.id }, data: { categoryId: keeper.id } });
          } else {
            // The stronger reviewer decision wins: an exclusion over an approval over an inference
            if (STATE_STRENGTH[membership.state] > STATE_STRENGTH[existing.state]) {
              await tx.noteCategory.update({ where: { id: existing.id }, data: { state: membership.state } });
            }
            await tx.noteCategory.delete({ where: { id: membership.id } });
          }
        }
        await tx.category.delete({ where: { id: duplicate.id } });
      }
      if (keeper.slug !== slug) {
        await tx.category.update({ where: { id: keeper.id }, data: { slug } });
      }
    });
  }
  log(`Categories: ${report.categoriesSlugged} slugged, ${report.categoriesMerged} merged`);
}

async function backfillNoteHashes(
  report: ImportIntegrityBackfillReport,
  dryRun: boolean,
  batchSize: number,
  log: (message: string) => void
) {
  let cursor: string | undefined;
  for (;;) {
    const notes = await prisma.note.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        html: true,
        titleSimHash: true,
        titleSimHashBands: true,
        rawHtmlHash: true,
        contentHash: true,
        parsedIngredientLines: {
          orderBy: [{ blockIndex: "asc" }, { lineIndex: "asc" }],
          select: { reference: true },
        },
        parsedInstructionLines: { orderBy: { lineIndex: "asc" }, select: { originalText: true } },
      },
    });
    if (notes.length === 0) break;
    cursor = notes[notes.length - 1]?.id;

    for (const note of notes) {
      const titleSimHash = note.titleSimHash ? padSimHash(note.titleSimHash) : null;
      const bands = titleSimHash ? simHashBands(titleSimHash) : [];
      const rawHtmlHash = computeRawHtmlHash(note.html);
      const contentHash = computeContentHash({
        title: note.title,
        ingredientLines: note.parsedIngredientLines.map((line) => line.reference),
        instructionLines: note.parsedInstructionLines.map((line) => line.originalText),
      });
      const unchanged =
        titleSimHash === note.titleSimHash &&
        JSON.stringify(bands) === JSON.stringify(note.titleSimHashBands ?? []) &&
        rawHtmlHash === note.rawHtmlHash &&
        contentHash === note.contentHash;
      if (unchanged) continue;
      report.notesHashed++;
      if (dryRun) continue;
      await prisma.note.update({
        where: { id: note.id },
        data: { titleSimHash, titleSimHashBands: bands, rawHtmlHash, contentHash },
      });
    }
  }
  log(`Notes: ${report.notesHashed} hashed`);
}

interface LegacyDuplicateDetails {
  duplicateNoteIds?: unknown;
}

async function backfillDuplicateCandidates(
  report: ImportIntegrityBackfillReport,
  dryRun: boolean,
  log: (message: string) => void
) {
  const notes = await prisma.note.findMany({
    where: { status: "DUPLICATE", duplicateCandidates: { none: {} } },
    select: { id: true, errorDetails: true, duplicateConfidence: true },
  });
  for (const note of notes) {
    const details = (note.errorDetails ?? {}) as LegacyDuplicateDetails;
    const ids = Array.isArray(details.duplicateNoteIds)
      ? details.duplicateNoteIds.filter((id): id is string => typeof id === "string" && id !== note.id)
      : [];
    if (ids.length === 0) continue;
    const existing = await prisma.note.findMany({ where: { id: { in: ids } }, select: { id: true } });
    for (const other of existing) {
      report.duplicateCandidatesCreated++;
      if (dryRun) continue;
      const signals: Prisma.InputJsonValue = toJson({
        rawHtmlHash: false,
        contentHash: false,
        sharedSourceIds: [],
        titleSimilarity: null,
        ingredientSimilarity: null,
        reasons: ["Flagged by the earlier duplicate check"],
      });
      await prisma.duplicateCandidate.upsert({
        where: { noteId_existingNoteId: { noteId: note.id, existingNoteId: other.id } },
        update: {},
        create: {
          noteId: note.id,
          existingNoteId: other.id,
          kind: "LIKELY",
          confidence: note.duplicateConfidence ?? 0.9,
          signals,
        },
      });
    }
  }
  log(`Duplicates: ${report.duplicateCandidatesCreated} candidates from earlier flags`);
}

async function backfillPrimarySources(
  report: ImportIntegrityBackfillReport,
  dryRun: boolean,
  batchSize: number,
  log: (message: string) => void
) {
  if (dryRun) return;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.noteSource.findMany({
      distinct: ["noteId"],
      orderBy: { noteId: "asc" },
      take: batchSize,
      ...(cursor ? { where: { noteId: { gt: cursor } } } : {}),
      select: { noteId: true },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1]?.noteId;
    for (const row of rows) {
      const change = await prisma.$transaction((tx) => refreshPrimarySource(tx, row.noteId));
      if (change) report.primarySourcesChanged++;
    }
  }
  log(`Primary sources: ${report.primarySourcesChanged} re-chosen`);
}

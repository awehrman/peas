import {
  type DuplicateCandidateStatus,
  type DuplicateKind,
  type NoteStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "../client.js";
import { normalizeForHash } from "../import-integrity/content-hash.js";
import {
  type DuplicateResolution,
  DuplicateResolutionSchema,
  type DuplicateSignals,
  DuplicateSignalsSchema,
  type ResolutionEffects,
  ResolutionEffectsSchema,
} from "../import-integrity/schemas.js";
import { simHashSimilarity } from "../import-integrity/simhash.js";
import { normalizeUrl } from "../import-integrity/url.js";
import { type NoteDetailRecord, findNotesWithSimilarTitles, getNoteDetail } from "./note.js";
import { OntologyError, parseOrThrow, toJson, uuidv7 } from "./ontology/helpers.js";
import { choosePrimarySource } from "../import-integrity/source-preference.js";
import { getRankableSources, refreshPrimarySource } from "./source.js";

type Tx = Prisma.TransactionClient;

/** Overall confidence at which a title-and-ingredient match blocks the import for review (unchanged from the original check). */
export const LIKELY_DUPLICATE_THRESHOLD = 0.9;
/** Confidence at which a pair is listed as a possible duplicate without blocking. */
export const POSSIBLE_DUPLICATE_THRESHOLD = 0.5;
/** Title similarity that, with a shared source, makes a likely duplicate (at most 4 of 32 SimHash bits differ). */
const SHARED_SOURCE_TITLE_THRESHOLD = 0.875;
const MAX_SOURCE_MATCHES = 50;

export interface DuplicateMatch {
  existingNoteId: string;
  kind: DuplicateKind;
  confidence: number;
  signals: DuplicateSignals;
}

function jaccard(first: Set<string>, second: Set<string>): number {
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  for (const item of first) if (second.has(item)) shared++;
  return shared / (first.size + second.size - shared);
}

function lineSet(lines: { reference: string; isActive: boolean }[]): Set<string> {
  return new Set(
    lines.filter((line) => line.isActive).map((line) => normalizeForHash(line.reference)).filter(Boolean)
  );
}

/**
 * Finds notes that look like the same recipe as `noteId`, strongest first. Signals: the same uploaded file (raw HTML hash), the same normalized content (content hash), a shared source (normalized URL, redirect target, or book), and title SimHash plus ingredient-line overlap. Archived notes are never candidates.
 *
 * @example
 * await findDuplicateMatches(noteId) // [{ existingNoteId: "cm3n...", kind: "EXACT", confidence: 1, signals: { contentHash: true, ... } }]
 */
export async function findDuplicateMatches(noteId: string): Promise<DuplicateMatch[]> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      title: true,
      titleSimHash: true,
      rawHtmlHash: true,
      contentHash: true,
      parsedIngredientLines: { select: { reference: true, isActive: true } },
      noteSources: {
        select: {
          sourceId: true,
          source: { select: { url: { select: { normalizedUrl: true, lastFinalUrl: true } } } },
        },
      },
    },
  });
  if (!note) throw new OntologyError("Note not found");

  const notArchived = { archivedAt: null, id: { not: noteId } };
  const sourceIds = note.noteSources.map((link) => link.sourceId);
  const urlForms = new Set<string>();
  for (const link of note.noteSources) {
    const url = link.source.url;
    if (url?.normalizedUrl) urlForms.add(url.normalizedUrl);
    const final = url?.lastFinalUrl ? normalizeUrl(url.lastFinalUrl) : null;
    if (final) urlForms.add(final);
  }

  const [byRaw, byContent, bySource, byTitle] = await Promise.all([
    note.rawHtmlHash
      ? prisma.note.findMany({ where: { ...notArchived, rawHtmlHash: note.rawHtmlHash }, select: { id: true } })
      : [],
    note.contentHash
      ? prisma.note.findMany({ where: { ...notArchived, contentHash: note.contentHash }, select: { id: true } })
      : [],
    sourceIds.length || urlForms.size
      ? prisma.noteSource.findMany({
          where: {
            note: notArchived,
            OR: [
              ...(sourceIds.length ? [{ sourceId: { in: sourceIds } }] : []),
              ...(urlForms.size
                ? [
                    { source: { url: { normalizedUrl: { in: [...urlForms] } } } },
                    { source: { url: { lastFinalUrl: { in: [...urlForms] } } } },
                  ]
                : []),
            ],
          },
          take: MAX_SOURCE_MATCHES,
          select: { noteId: true, sourceId: true },
        })
      : [],
    note.titleSimHash ? findNotesWithSimilarTitles(note.titleSimHash, 3, noteId) : [],
  ]);

  const raw = new Set(byRaw.map((row) => row.id));
  const content = new Set(byContent.map((row) => row.id));
  const sharedSources = new Map<string, Set<string>>();
  for (const row of bySource) {
    const set = sharedSources.get(row.noteId) ?? new Set<string>();
    set.add(row.sourceId);
    sharedSources.set(row.noteId, set);
  }
  const candidateIds = new Set<string>([
    ...raw,
    ...content,
    ...sharedSources.keys(),
    ...byTitle.map((row) => row.id),
  ]);
  if (candidateIds.size === 0) return [];

  const others = await prisma.note.findMany({
    where: { id: { in: [...candidateIds] } },
    select: {
      id: true,
      titleSimHash: true,
      parsedIngredientLines: { select: { reference: true, isActive: true } },
    },
  });
  const ownLines = lineSet(note.parsedIngredientLines);

  const matches: DuplicateMatch[] = [];
  for (const other of others) {
    const titleSimilarity =
      note.titleSimHash && other.titleSimHash
        ? simHashSimilarity(note.titleSimHash, other.titleSimHash)
        : null;
    const otherLines = lineSet(other.parsedIngredientLines);
    const ingredientSimilarity =
      ownLines.size && otherLines.size ? jaccard(ownLines, otherLines) : null;
    const shared = [...(sharedSources.get(other.id) ?? [])];

    const reasons: string[] = [];
    if (raw.has(other.id)) reasons.push("Same uploaded file");
    if (content.has(other.id)) reasons.push("Same title, ingredients, and instructions");
    if (shared.length) reasons.push("Same source");
    if (titleSimilarity !== null) reasons.push(`Title similarity ${Math.round(titleSimilarity * 100)}%`);
    if (ingredientSimilarity !== null)
      reasons.push(`Ingredient overlap ${Math.round(ingredientSimilarity * 100)}%`);

    const signals: DuplicateSignals = {
      rawHtmlHash: raw.has(other.id),
      contentHash: content.has(other.id),
      sharedSourceIds: shared,
      titleSimilarity,
      ingredientSimilarity,
      reasons,
    };

    const similarity =
      Math.round(((titleSimilarity ?? 0) * 0.7 + (ingredientSimilarity ?? 0) * 0.3) * 100) / 100;
    let kind: DuplicateKind | null = null;
    let confidence = similarity;
    if (signals.rawHtmlHash || signals.contentHash) {
      kind = "EXACT";
      confidence = 1;
    } else if (
      similarity >= LIKELY_DUPLICATE_THRESHOLD ||
      (shared.length > 0 && (titleSimilarity ?? 0) >= SHARED_SOURCE_TITLE_THRESHOLD)
    ) {
      kind = "LIKELY";
      confidence = Math.min(1, Math.max(similarity, shared.length ? 0.9 : 0));
    } else if (similarity >= POSSIBLE_DUPLICATE_THRESHOLD) {
      kind = "POSSIBLE";
    }
    if (kind) matches.push({ existingNoteId: other.id, kind, confidence, signals });
  }

  const rank: Record<DuplicateKind, number> = { EXACT: 0, LIKELY: 1, POSSIBLE: 2 };
  return matches.sort((a, b) => rank[a.kind] - rank[b.kind] || b.confidence - a.confidence);
}

/**
 * Stores duplicate candidates for an incoming note, one per pair. Pairs a reviewer already settled (in either direction) are not raised again. EXACT and LIKELY candidates hold the note as DUPLICATE until a decision; POSSIBLE ones are only listed for review.
 *
 * @example
 * await recordDuplicateCandidates(noteId, matches) // { blocking: true, highestConfidence: 1, candidateIds: ["0193..."] }
 */
export async function recordDuplicateCandidates(
  noteId: string,
  matches: DuplicateMatch[]
): Promise<{ blocking: boolean; highestConfidence: number; candidateIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    const settled = await tx.duplicateCandidate.findMany({
      where: {
        status: { in: ["RESOLVED", "DISMISSED"] },
        OR: [{ noteId }, { existingNoteId: noteId }],
      },
      select: { noteId: true, existingNoteId: true },
    });
    const settledWith = new Set(
      settled.map((row) => (row.noteId === noteId ? row.existingNoteId : row.noteId))
    );

    const candidateIds: string[] = [];
    let blocking = false;
    let highestConfidence = 0;
    for (const match of matches) {
      if (settledWith.has(match.existingNoteId)) continue;
      const signals = toJson(parseOrThrow(DuplicateSignalsSchema, match.signals, "DuplicateCandidate.signals"));
      const row = await tx.duplicateCandidate.upsert({
        where: { noteId_existingNoteId: { noteId, existingNoteId: match.existingNoteId } },
        update: { kind: match.kind, confidence: match.confidence, signals },
        create: {
          noteId,
          existingNoteId: match.existingNoteId,
          kind: match.kind,
          confidence: match.confidence,
          signals,
        },
        select: { id: true, status: true },
      });
      if (row.status !== "PENDING") continue;
      candidateIds.push(row.id);
      if (match.kind !== "POSSIBLE") {
        blocking = true;
        highestConfidence = Math.max(highestConfidence, match.confidence);
      }
    }

    if (blocking) {
      await tx.note.update({
        where: { id: noteId },
        data: {
          status: "DUPLICATE",
          duplicateConfidence: highestConfidence,
          errorMessage: "Possible duplicate: waiting for a decision on the import page.",
        },
      });
    }
    return { blocking, highestConfidence, candidateIds };
  });
}

// ============================================================================
// REVIEW
// ============================================================================

export interface DuplicateNoteSummary {
  id: string;
  title: string | null;
  status: NoteStatus;
  createdAt: string;
  archivedAt: string | null;
  recipeId: string | null;
  ingredientLineCount: number;
}

export interface DuplicateCandidateRecord {
  id: string;
  kind: DuplicateKind;
  confidence: number;
  status: DuplicateCandidateStatus;
  signals: DuplicateSignals;
  resolution: DuplicateResolution | null;
  resolvedAt: string | null;
  createdAt: string;
  incoming: DuplicateNoteSummary;
  existing: DuplicateNoteSummary;
}

const SUMMARY_SELECT = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  archivedAt: true,
  recipe: { select: { id: true } },
  _count: { select: { parsedIngredientLines: true } },
} as const;

type SummaryRow = Prisma.NoteGetPayload<{ select: typeof SUMMARY_SELECT }>;

function toSummary(row: SummaryRow): DuplicateNoteSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    recipeId: row.recipe?.id ?? null,
    ingredientLineCount: row._count.parsedIngredientLines,
  };
}

const CANDIDATE_INCLUDE = {
  note: { select: SUMMARY_SELECT },
  existingNote: { select: SUMMARY_SELECT },
} as const;

type CandidateRow = Prisma.DuplicateCandidateGetPayload<{ include: typeof CANDIDATE_INCLUDE }>;

function toCandidateRecord(row: CandidateRow): DuplicateCandidateRecord {
  return {
    id: row.id,
    kind: row.kind,
    confidence: row.confidence,
    status: row.status,
    signals: parseOrThrow(DuplicateSignalsSchema, row.signals, "DuplicateCandidate.signals"),
    resolution: row.resolution
      ? parseOrThrow(DuplicateResolutionSchema, row.resolution, "DuplicateCandidate.resolution")
      : null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    incoming: toSummary(row.note),
    existing: toSummary(row.existingNote),
  };
}

export interface DuplicateCandidatesQuery {
  kinds?: DuplicateKind[];
  statuses?: DuplicateCandidateStatus[];
  /** Only pairs that share a source but not their content: one source cited by two different-looking notes. */
  sourceConflictsOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/** Pending pairs that share a source without being exact copies. */
async function sourceConflictIds(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT candidate.id::text AS id
    FROM "DuplicateCandidate" candidate
    JOIN "Note" incoming ON incoming.id = candidate."noteId"
    JOIN "Note" existing ON existing.id = candidate."existingNoteId"
    WHERE candidate.status = 'PENDING'
      AND candidate.kind <> 'EXACT'
      AND jsonb_array_length(coalesce(candidate.signals->'sharedSourceIds', '[]'::jsonb)) > 0
      AND incoming."archivedAt" IS NULL
      AND existing."archivedAt" IS NULL
  `;
  return rows.map((row) => row.id);
}

/**
 * Duplicate candidates for the import review tab, newest first. Pending pairs whose incoming note was archived by another decision are left out.
 *
 * @example
 * await listDuplicateCandidates({ kinds: ["EXACT"], statuses: ["PENDING"] })
 */
export async function listDuplicateCandidates({
  kinds,
  statuses = ["PENDING"],
  sourceConflictsOnly = false,
  page = 1,
  pageSize = 25,
}: DuplicateCandidatesQuery = {}): Promise<{
  items: DuplicateCandidateRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const currentPage = Math.max(1, Math.floor(page));
  const where: Prisma.DuplicateCandidateWhereInput = {
    status: { in: statuses },
    ...(sourceConflictsOnly ? { id: { in: await sourceConflictIds() } } : {}),
    ...(kinds?.length ? { kind: { in: kinds } } : {}),
    ...(statuses.includes("PENDING") && statuses.length === 1
      ? { note: { archivedAt: null }, existingNote: { archivedAt: null } }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.duplicateCandidate.count({ where }),
    prisma.duplicateCandidate.findMany({
      where,
      include: CANDIDATE_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items: rows.map(toCandidateRecord), total, page: currentPage, pageSize };
}

export interface DuplicateCandidateDetail extends DuplicateCandidateRecord {
  incomingNote: NoteDetailRecord;
  existingNote: NoteDetailRecord;
}

/** A candidate with both notes in full, for the side-by-side review page. */
export async function getDuplicateCandidate(id: string): Promise<DuplicateCandidateDetail | null> {
  const row = await prisma.duplicateCandidate.findUnique({ where: { id }, include: CANDIDATE_INCLUDE });
  if (!row) return null;
  const [incomingNote, existingNote] = await Promise.all([
    getNoteDetail(row.noteId),
    getNoteDetail(row.existingNoteId),
  ]);
  if (!incomingNote || !existingNote) return null;
  return { ...toCandidateRecord(row), incomingNote, existingNote };
}

/** Pending candidate counts by kind, for the review tab. */
export async function getDuplicateCounts(): Promise<
  Record<DuplicateKind, number> & { resolved: number; sourceConflicts: number }
> {
  const [pending, resolved, conflicts] = await Promise.all([
    prisma.duplicateCandidate.groupBy({
      by: ["kind"],
      where: { status: "PENDING", note: { archivedAt: null }, existingNote: { archivedAt: null } },
      _count: { _all: true },
    }),
    prisma.duplicateCandidate.count({ where: { status: { in: ["RESOLVED", "DISMISSED"] } } }),
    sourceConflictIds(),
  ]);
  const counts = { EXACT: 0, LIKELY: 0, POSSIBLE: 0, resolved, sourceConflicts: conflicts.length };
  for (const row of pending) counts[row.kind] = row._count._all;
  return counts;
}

// ============================================================================
// RESOLUTION
// ============================================================================

export interface ResolutionPreview {
  keptNote: { id: string; title: string | null } | null;
  archivedNote: { id: string; title: string | null } | null;
  /** Sources that will be attached to the kept note. */
  attachedSources: { sourceId: string; label: string; inactive: boolean }[];
  /** The kept note's primary source after the merge, when it changes. */
  primarySourceChange: { from: string | null; to: string | null } | null;
  /** Reviewer category decisions carried over to the kept note. */
  carriedCategories: { name: string; state: "APPROVED" | "EXCLUDED" }[];
  carriedTags: string[];
  /** The recipe that moves to the kept note (keeping its title and tags). */
  movedRecipeId: string | null;
  /** Human-readable summary, one line per effect. */
  summary: string[];
}

interface ResolutionPlan {
  candidate: { id: string; noteId: string; existingNoteId: string; status: DuplicateCandidateStatus };
  keptId: string | null;
  archivedId: string | null;
  sourcesToAttach: { sourceId: string; originalText: string | null; label: string; inactive: boolean }[];
  categoriesToCreate: { categoryId: string; name: string; state: "APPROVED" | "EXCLUDED"; origin: "DUPLICATE_MERGE" }[];
  categoriesToUpdate: { id: string; name: string; from: "INFERRED" | "APPROVED" | "EXCLUDED"; to: "APPROVED" | "EXCLUDED" }[];
  tagsToConnect: { tagId: string; name: string }[];
  recipeToMove: { recipeId: string; fromNoteId: string; toNoteId: string } | null;
  incomingStatus: NoteStatus;
}

function sourceLabel(source: {
  displayName: string | null;
  url: { originalUrl: string } | null;
  book: { title: string } | null;
}): string {
  return source.book?.title ?? source.url?.originalUrl ?? source.displayName ?? "Source";
}

async function planResolution(
  tx: Tx,
  candidateId: string,
  resolution: DuplicateResolution
): Promise<ResolutionPlan> {
  const candidate = await tx.duplicateCandidate.findUnique({
    where: { id: candidateId },
    select: { id: true, noteId: true, existingNoteId: true, status: true },
  });
  if (!candidate) throw new OntologyError("Duplicate candidate not found");

  const incoming = await tx.note.findUniqueOrThrow({
    where: { id: candidate.noteId },
    select: { status: true, archivedAt: true },
  });
  const keptId =
    resolution.keep === "EXISTING"
      ? candidate.existingNoteId
      : resolution.keep === "INCOMING"
        ? candidate.noteId
        : null;
  const archivedId =
    resolution.keep === "EXISTING"
      ? candidate.noteId
      : resolution.keep === "INCOMING"
        ? candidate.existingNoteId
        : null;

  const plan: ResolutionPlan = {
    candidate,
    keptId,
    archivedId,
    sourcesToAttach: [],
    categoriesToCreate: [],
    categoriesToUpdate: [],
    tagsToConnect: [],
    recipeToMove: null,
    incomingStatus: incoming.status,
  };
  if (!keptId || !archivedId) return plan;

  if (resolution.mergeSources) {
    const [keptLinks, archivedLinks] = await Promise.all([
      tx.noteSource.findMany({ where: { noteId: keptId }, select: { sourceId: true } }),
      tx.noteSource.findMany({
        where: { noteId: archivedId },
        select: {
          sourceId: true,
          originalText: true,
          source: {
            select: {
              displayName: true,
              url: { select: { originalUrl: true, checkStatus: true } },
              book: { select: { title: true } },
            },
          },
        },
      }),
    ]);
    const kept = new Set(keptLinks.map((link) => link.sourceId));
    plan.sourcesToAttach = archivedLinks
      .filter((link) => !kept.has(link.sourceId))
      .map((link) => ({
        sourceId: link.sourceId,
        originalText: link.originalText,
        label: sourceLabel(link.source),
        inactive:
          link.source.url?.checkStatus === "UNREACHABLE" || link.source.url?.checkStatus === "BLOCKED",
      }));
  }

  // Keeping the incoming copy carries the existing note's curation over to it
  if (resolution.keep === "INCOMING") {
    const [fromCategories, toCategories, fromTags, toTags, fromRecipe, toRecipe] = await Promise.all([
      tx.noteCategory.findMany({
        where: { noteId: archivedId, state: { in: ["APPROVED", "EXCLUDED"] } },
        select: { categoryId: true, state: true, category: { select: { name: true } } },
      }),
      tx.noteCategory.findMany({ where: { noteId: keptId }, select: { id: true, categoryId: true, state: true } }),
      tx.tag.findMany({ where: { notes: { some: { id: archivedId } } }, select: { id: true, name: true } }),
      tx.tag.findMany({ where: { notes: { some: { id: keptId } } }, select: { id: true } }),
      tx.recipe.findUnique({ where: { noteId: archivedId }, select: { id: true } }),
      tx.recipe.findUnique({ where: { noteId: keptId }, select: { id: true } }),
    ]);
    const keptByCategory = new Map(toCategories.map((row) => [row.categoryId, row]));
    for (const row of fromCategories) {
      const state = row.state as "APPROVED" | "EXCLUDED";
      const current = keptByCategory.get(row.categoryId);
      if (!current) {
        plan.categoriesToCreate.push({
          categoryId: row.categoryId,
          name: row.category.name,
          state,
          origin: "DUPLICATE_MERGE",
        });
      } else if (current.state === "INFERRED") {
        plan.categoriesToUpdate.push({ id: current.id, name: row.category.name, from: "INFERRED", to: state });
      }
    }
    const keptTags = new Set(toTags.map((tag) => tag.id));
    plan.tagsToConnect = fromTags
      .filter((tag) => !keptTags.has(tag.id))
      .map((tag) => ({ tagId: tag.id, name: tag.name }));
    if (fromRecipe && !toRecipe) {
      plan.recipeToMove = { recipeId: fromRecipe.id, fromNoteId: archivedId, toNoteId: keptId };
    }
  }
  return plan;
}

async function describePlan(tx: Tx, plan: ResolutionPlan): Promise<ResolutionPreview> {
  const ids = [plan.keptId, plan.archivedId].filter((id): id is string => id !== null);
  const notes = await tx.note.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
  const title = (id: string | null) => (id ? (notes.find((note) => note.id === id) ?? null) : null);
  const keptNote = title(plan.keptId);
  const archivedNote = title(plan.archivedId);

  let primarySourceChange: ResolutionPreview["primarySourceChange"] = null;
  if (plan.keptId && plan.sourcesToAttach.length) {
    // Rank the merged set without writing anything
    const current = await getRankableSources(tx, plan.keptId);
    const attached = await tx.source.findMany({
      where: { id: { in: plan.sourcesToAttach.map((source) => source.sourceId) } },
      select: {
        id: true,
        kind: true,
        book: { select: { matchStatus: true } },
        url: { select: { checkStatus: true } },
      },
    });
    const from = current.find((source) => source.isPrimary)?.sourceId ?? null;
    const to = choosePrimarySource(
      [
        ...current,
        ...attached.map((source) => ({
          sourceId: source.id,
          kind: source.kind,
          bookMatchStatus: source.book?.matchStatus ?? null,
          urlCheckStatus: source.url?.checkStatus ?? null,
        })),
      ],
      from
    );
    primarySourceChange = { from, to };
  }

  const summary: string[] = [];
  if (!plan.keptId) {
    summary.push("Both notes stay. This pair won't be flagged again.");
  } else {
    summary.push(`Keep "${keptNote?.title ?? "Untitled"}" and archive "${archivedNote?.title ?? "Untitled"}" (reversible; nothing is deleted).`);
    for (const source of plan.sourcesToAttach) {
      summary.push(`Attach source ${source.label}${source.inactive ? " (inactive: its last check failed)" : ""}.`);
    }
    for (const category of [...plan.categoriesToCreate, ...plan.categoriesToUpdate.map((row) => ({ name: row.name, state: row.to }))]) {
      summary.push(`Carry over category decision: ${category.name} (${category.state === "APPROVED" ? "approved" : "excluded"}).`);
    }
    if (plan.tagsToConnect.length) summary.push(`Carry over tags: ${plan.tagsToConnect.map((tag) => tag.name).join(", ")}.`);
    if (plan.recipeToMove) summary.push("The saved recipe moves to the kept note, keeping its title and tags.");
  }

  return {
    keptNote,
    archivedNote,
    attachedSources: plan.sourcesToAttach.map(({ sourceId, label, inactive }) => ({ sourceId, label, inactive })),
    primarySourceChange: primarySourceChange && primarySourceChange.from !== primarySourceChange.to ? primarySourceChange : null,
    carriedCategories: [
      ...plan.categoriesToCreate.map((row) => ({ name: row.name, state: row.state })),
      ...plan.categoriesToUpdate.map((row) => ({ name: row.name, state: row.to })),
    ],
    carriedTags: plan.tagsToConnect.map((tag) => tag.name),
    movedRecipeId: plan.recipeToMove?.recipeId ?? null,
    summary,
  };
}

/**
 * What a decision would do, without writing anything.
 *
 * @example
 * await previewDuplicateResolution(id, { keep: "EXISTING", mergeSources: true }) // { archivedNote: {...}, attachedSources: [...], summary: [...] }
 */
export async function previewDuplicateResolution(
  candidateId: string,
  resolution: DuplicateResolution
): Promise<ResolutionPreview> {
  const input = parseOrThrow(DuplicateResolutionSchema, resolution, "duplicate resolution");
  return prisma.$transaction(async (tx) => describePlan(tx, await planResolution(tx, candidateId, input)));
}

function sameResolution(a: DuplicateResolution, b: DuplicateResolution): boolean {
  return a.keep === b.keep && a.mergeSources === b.mergeSources;
}

/**
 * Applies a duplicate decision in one transaction and records every effect for undo. Content kept and sources merged are separate choices; the archived note keeps all its rows. Repeating the same decision does nothing; a different decision needs an undo first.
 *
 * @example
 * await resolveDuplicate(id, { keep: "EXISTING", mergeSources: true }, userId) // { noteIds: [incomingId, existingId], alreadyResolved: false }
 */
export async function resolveDuplicate(
  candidateId: string,
  resolution: DuplicateResolution,
  userId: string | null
): Promise<{ noteIds: string[]; alreadyResolved: boolean; preview: ResolutionPreview }> {
  const input = parseOrThrow(DuplicateResolutionSchema, resolution, "duplicate resolution");
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.duplicateCandidate.findUnique({
        where: { id: candidateId },
        select: { status: true, resolution: true, noteId: true, existingNoteId: true },
      });
      if (!existing) throw new OntologyError("Duplicate candidate not found");
      if (existing.status !== "PENDING") {
        const previous = existing.resolution
          ? parseOrThrow(DuplicateResolutionSchema, existing.resolution, "DuplicateCandidate.resolution")
          : null;
        if (previous && sameResolution(previous, input)) {
          const plan = await planResolution(tx, candidateId, input);
          return {
            noteIds: [existing.noteId, existing.existingNoteId],
            alreadyResolved: true,
            preview: await describePlan(tx, plan),
          };
        }
        throw new OntologyError("This pair was already decided. Undo that decision first.");
      }

      const plan = await planResolution(tx, candidateId, input);
      const preview = await describePlan(tx, plan);
      const effects = await applyPlan(tx, plan);

      await tx.duplicateCandidate.update({
        where: { id: candidateId },
        data: {
          status: plan.keptId ? "RESOLVED" : "DISMISSED",
          resolution: toJson(input),
          resolutionEffects: toJson(parseOrThrow(ResolutionEffectsSchema, effects, "resolution effects")),
          resolvedAt: new Date(),
          resolvedById: userId,
        },
      });
      return {
        noteIds: [plan.candidate.noteId, plan.candidate.existingNoteId],
        alreadyResolved: false,
        preview,
      };
    },
    { timeout: 30_000 }
  );
}

async function applyPlan(tx: Tx, plan: ResolutionPlan): Promise<ResolutionEffects> {
  const effects: ResolutionEffects = {
    archivedNoteIds: [],
    statusChanges: [],
    dismissedCandidateIds: [],
    createdNoteSourceIds: [],
    primaryChanges: [],
    createdNoteCategoryIds: [],
    categoryStateChanges: [],
    connectedTags: [],
    movedRecipe: null,
  };
  const incomingId = plan.candidate.noteId;

  // The incoming note leaves the review hold unless it is the one archived
  if (plan.archivedId !== incomingId && plan.incomingStatus === "DUPLICATE") {
    await tx.note.update({
      where: { id: incomingId },
      data: { status: "COMPLETED", errorMessage: null },
    });
    effects.statusChanges.push({ noteId: incomingId, from: "DUPLICATE", to: "COMPLETED" });
  }

  if (!plan.keptId || !plan.archivedId) return effects;
  const { keptId, archivedId } = plan;

  const kept = await tx.note.findUniqueOrThrow({ where: { id: keptId }, select: { title: true } });
  await tx.note.update({
    where: { id: archivedId },
    data: {
      archivedAt: new Date(),
      archivedReason: `Duplicate of "${kept.title ?? "Untitled"}"`,
      supersededById: keptId,
    },
  });
  effects.archivedNoteIds.push(archivedId);

  const otherPending = await tx.duplicateCandidate.findMany({
    where: {
      id: { not: plan.candidate.id },
      status: "PENDING",
      OR: [{ noteId: archivedId }, { existingNoteId: archivedId }],
    },
    select: { id: true },
  });
  if (otherPending.length) {
    await tx.duplicateCandidate.updateMany({
      where: { id: { in: otherPending.map((row) => row.id) } },
      data: { status: "DISMISSED", resolvedAt: new Date() },
    });
    effects.dismissedCandidateIds.push(...otherPending.map((row) => row.id));
  }

  for (const source of plan.sourcesToAttach) {
    const id = uuidv7();
    await tx.noteSource.create({
      data: {
        id,
        noteId: keptId,
        sourceId: source.sourceId,
        originalText: source.originalText,
        origin: "DUPLICATE_MERGE",
      },
    });
    effects.createdNoteSourceIds.push(id);
  }
  if (plan.sourcesToAttach.length) {
    const change = await refreshPrimarySource(tx, keptId);
    if (change) effects.primaryChanges.push({ noteId: keptId, ...change });
  }

  for (const category of plan.categoriesToCreate) {
    const id = uuidv7();
    await tx.noteCategory.create({
      data: {
        id,
        noteId: keptId,
        categoryId: category.categoryId,
        state: category.state,
        origin: category.origin,
        decidedAt: new Date(),
      },
    });
    effects.createdNoteCategoryIds.push(id);
  }
  for (const change of plan.categoriesToUpdate) {
    await tx.noteCategory.update({ where: { id: change.id }, data: { state: change.to } });
    effects.categoryStateChanges.push({ id: change.id, from: change.from, to: change.to });
  }

  if (plan.tagsToConnect.length) {
    await tx.note.update({
      where: { id: keptId },
      data: { tags: { connect: plan.tagsToConnect.map((tag) => ({ id: tag.tagId })) } },
    });
    effects.connectedTags.push(...plan.tagsToConnect.map((tag) => ({ noteId: keptId, tagId: tag.tagId })));
  }

  if (plan.recipeToMove) {
    await tx.recipe.update({
      where: { id: plan.recipeToMove.recipeId },
      data: { noteId: plan.recipeToMove.toNoteId },
    });
    effects.movedRecipe = plan.recipeToMove;
  }
  return effects;
}

/**
 * Reverses a decision exactly as recorded, newest effect first, and puts the pair back in review. Rows removed since are skipped rather than failing.
 *
 * @example
 * await undoDuplicateResolution(id) // { noteIds: [incomingId, existingId] }
 */
export async function undoDuplicateResolution(candidateId: string): Promise<{ noteIds: string[] }> {
  return prisma.$transaction(
    async (tx) => {
      const candidate = await tx.duplicateCandidate.findUnique({
        where: { id: candidateId },
        select: { status: true, resolutionEffects: true, noteId: true, existingNoteId: true },
      });
      if (!candidate) throw new OntologyError("Duplicate candidate not found");
      if (candidate.status === "PENDING") {
        return { noteIds: [candidate.noteId, candidate.existingNoteId] };
      }
      const effects = candidate.resolutionEffects
        ? parseOrThrow(ResolutionEffectsSchema, candidate.resolutionEffects, "DuplicateCandidate.resolutionEffects")
        : null;

      if (effects) {
        if (effects.movedRecipe) {
          await tx.recipe.updateMany({
            where: { id: effects.movedRecipe.recipeId, noteId: effects.movedRecipe.toNoteId },
            data: { noteId: effects.movedRecipe.fromNoteId },
          });
        }
        for (const tag of effects.connectedTags) {
          await tx.note.update({
            where: { id: tag.noteId },
            data: { tags: { disconnect: { id: tag.tagId } } },
          });
        }
        for (const change of effects.categoryStateChanges) {
          await tx.noteCategory.updateMany({ where: { id: change.id }, data: { state: change.from } });
        }
        if (effects.createdNoteCategoryIds.length) {
          await tx.noteCategory.deleteMany({ where: { id: { in: effects.createdNoteCategoryIds } } });
        }
        if (effects.createdNoteSourceIds.length) {
          await tx.noteSource.deleteMany({ where: { id: { in: effects.createdNoteSourceIds } } });
        }
        for (const change of effects.primaryChanges) {
          await tx.noteSource.updateMany({
            where: { noteId: change.noteId, isPrimary: true },
            data: { isPrimary: false },
          });
          if (change.from) {
            await tx.noteSource.updateMany({
              where: { noteId: change.noteId, sourceId: change.from },
              data: { isPrimary: true },
            });
          }
        }
        if (effects.dismissedCandidateIds.length) {
          await tx.duplicateCandidate.updateMany({
            where: { id: { in: effects.dismissedCandidateIds }, status: "DISMISSED" },
            data: { status: "PENDING", resolvedAt: null },
          });
        }
        if (effects.archivedNoteIds.length) {
          await tx.note.updateMany({
            where: { id: { in: effects.archivedNoteIds } },
            data: { archivedAt: null, archivedReason: null, supersededById: null },
          });
        }
        for (const change of effects.statusChanges) {
          await tx.note.updateMany({
            where: { id: change.noteId, status: change.to },
            data: { status: change.from },
          });
        }
      }

      await tx.duplicateCandidate.update({
        where: { id: candidateId },
        data: {
          status: "PENDING",
          resolution: Prisma.DbNull,
          resolutionEffects: Prisma.DbNull,
          resolvedAt: null,
          resolvedById: null,
        },
      });
      return { noteIds: [candidate.noteId, candidate.existingNoteId] };
    },
    { timeout: 30_000 }
  );
}

/**
 * Keeps the existing note for every pending EXACT pair (the same file or identical content imported again), merging sources. Each pair is its own transaction, so one failure does not undo the rest.
 *
 * @example
 * await resolveExactDuplicatesBatch(userId) // { resolved: 14, failed: 0, noteIds: [...] }
 */
export async function resolveExactDuplicatesBatch(
  userId: string | null,
  candidateIds?: string[]
): Promise<{ resolved: number; failed: number; noteIds: string[] }> {
  const rows = await prisma.duplicateCandidate.findMany({
    where: {
      kind: "EXACT",
      status: "PENDING",
      note: { archivedAt: null },
      existingNote: { archivedAt: null },
      ...(candidateIds ? { id: { in: candidateIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  let resolved = 0;
  let failed = 0;
  const noteIds = new Set<string>();
  for (const row of rows) {
    try {
      const result = await resolveDuplicate(row.id, { keep: "EXISTING", mergeSources: true }, userId);
      resolved++;
      for (const id of result.noteIds) noteIds.add(id);
    } catch {
      // A pair settled by an earlier one in this batch (its note was archived) is skipped
      failed++;
    }
  }
  return { resolved, failed, noteIds: [...noteIds] };
}

import {
  BlockSignalSchema,
  type ContentBlock,
  PARSER_VERSION,
  type ResolverContext,
  type StructureFinding,
  StructureProposalSchema,
  processIngredientLine,
  proposalLabel,
  segmentContent,
  splitStoredContent,
  validateStructure,
} from "@peas/parser/v2";
import {
  type LineKind,
  Prisma,
  type StructureProposalStatus,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";

import { prisma } from "../client.js";

import { writeProcessedLines } from "./ontology/backfill.js";
import {
  type DbClient,
  OntologyError,
  parseOrThrow,
  toJson,
} from "./ontology/helpers.js";
import { loadResolverContext } from "./ontology/resolver-context.js";

/** Kinds a reviewer can give a line. */
export const LINE_LABELS = [
  "INGREDIENT",
  "INSTRUCTION",
  "SECTION_HEADING",
  "NOTE",
  "OTHER",
] as const satisfies readonly LineKind[];
export type LineLabel = (typeof LINE_LABELS)[number];

/** A pattern may be applied automatically only with at least this precision over at least this many decisions. */
export const AUTO_APPLY_MIN_PRECISION = 0.98;
export const AUTO_APPLY_MIN_DECISIONS = 50;

const CONTEXT_RADIUS = 2;
const PARSER_TAG = `v2:${PARSER_VERSION}`;

/**
 * @example
 * structureTextHash(" For the sauce: ") === structureTextHash("For the sauce:") // true
 */
export function structureTextHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * The proposal and its strongest signal, so findings that fire for the same reason group together.
 *
 * @example
 * patternKeyOf(finding) // "SECTION_HEADING:COLON_HEADING"
 */
export function patternKeyOf(finding: StructureFinding): string {
  const strongest = [...finding.signals]
    .filter((signal) => signal.id !== "IMPORTER_SECTION")
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0];
  return `${proposalLabel(finding.proposal)}:${strongest?.id ?? "NONE"}`;
}

const SignalsSchema = z.array(BlockSignalSchema);

/**
 * Stores a note's findings as proposals, keyed by note, position, and text. Decided proposals are never touched; open ones are refreshed with the current classifier's reading. With `supersedeMissing`, open proposals the validator no longer raises become SUPERSEDED.
 *
 * @example
 * await saveStructureFindings(noteId, validateStructure(blocks).findings, { supersedeMissing: true })
 * // { created: 1, updated: 0, superseded: 0 }
 */
export async function saveStructureFindings(
  noteId: string,
  findings: readonly StructureFinding[],
  { supersedeMissing = false }: { supersedeMissing?: boolean } = {},
  db: DbClient = prisma
): Promise<{ created: number; updated: number; superseded: number }> {
  const existing = await db.structureProposal.findMany({
    where: { noteId },
    select: { id: true, contentIndex: true, textHash: true, status: true },
  });
  const byKey = new Map(
    existing.map((row) => [`${row.contentIndex}:${row.textHash}`, row])
  );
  const seen = new Set<string>();
  const summary = { created: 0, updated: 0, superseded: 0 };

  for (const finding of findings) {
    const textHash = structureTextHash(finding.text);
    const key = `${finding.contentIndex}:${textHash}`;
    seen.add(key);
    const data = {
      text: finding.text,
      assignedKind: finding.assigned,
      proposal: toJson(
        parseOrThrow(
          StructureProposalSchema,
          finding.proposal,
          "StructureProposal.proposal"
        )
      ),
      proposedLabel: proposalLabel(finding.proposal),
      patternKey: patternKeyOf(finding),
      margin: finding.margin,
      signals: toJson(
        parseOrThrow(
          SignalsSchema,
          finding.signals,
          "StructureProposal.signals"
        )
      ),
      classifierVersion: finding.classifierVersion,
    };
    const row = byKey.get(key);
    if (!row) {
      await db.structureProposal.create({
        data: { noteId, contentIndex: finding.contentIndex, textHash, ...data },
      });
      summary.created += 1;
    } else if (row.status === "OPEN" || row.status === "SUPERSEDED") {
      await db.structureProposal.update({
        where: { id: row.id },
        data: { ...data, status: "OPEN" },
      });
      summary.updated += 1;
    }
  }

  if (supersedeMissing) {
    const stale = existing.filter(
      (row) =>
        row.status === "OPEN" &&
        !seen.has(`${row.contentIndex}:${row.textHash}`)
    );
    if (stale.length > 0) {
      await db.structureProposal.updateMany({
        where: { id: { in: stale.map((row) => row.id) } },
        data: { status: "SUPERSEDED" },
      });
      summary.superseded = stale.length;
    }
  }
  return summary;
}

/**
 * Records each stored line's position in the note content (and, at import, the element it came from) where the line still matches what the content rebuilds to (same block, line, and text). Lines that were edited or removed after import keep a null position.
 *
 * @example
 * await assignContentIndexes(noteId, segmentContent(splitStoredContent(note.html))) // { ingredients: 14, instructions: 7 }
 */
export async function assignContentIndexes(
  noteId: string,
  blocks: readonly ContentBlock[],
  { contentTags }: { contentTags?: readonly string[] } = {},
  db: DbClient = prisma
): Promise<{ ingredients: number; instructions: number }> {
  const tagAt = (contentIndex: number) => contentTags?.[contentIndex] ?? null;
  const ingredientKeys = new Map<string, number>();
  const instructionKeys = new Map<string, number>();
  for (const block of blocks) {
    if (block.assigned === "INGREDIENT")
      ingredientKeys.set(
        `${block.blockIndex}:${block.lineIndex}:${block.text}`,
        block.contentIndex
      );
    else
      instructionKeys.set(
        `${block.lineIndex}:${block.text}`,
        block.contentIndex
      );
  }
  const [ingredients, instructions] = await Promise.all([
    db.parsedIngredientLine.findMany({
      where: { noteId, contentIndex: null },
      select: { id: true, blockIndex: true, lineIndex: true, reference: true },
    }),
    db.parsedInstructionLine.findMany({
      where: { noteId, contentIndex: null },
      select: { id: true, lineIndex: true, originalText: true },
    }),
  ]);
  const counts = { ingredients: 0, instructions: 0 };
  for (const line of ingredients) {
    const contentIndex = ingredientKeys.get(
      `${line.blockIndex}:${line.lineIndex}:${line.reference.trim()}`
    );
    if (contentIndex === undefined) continue;
    await db.parsedIngredientLine.update({
      where: { id: line.id },
      data: { contentIndex, elementTag: tagAt(contentIndex) },
    });
    counts.ingredients += 1;
  }
  for (const line of instructions) {
    const contentIndex = instructionKeys.get(
      `${line.lineIndex}:${line.originalText.trim()}`
    );
    if (contentIndex === undefined) continue;
    await db.parsedInstructionLine.update({
      where: { id: line.id },
      data: { contentIndex, elementTag: tagAt(contentIndex) },
    });
    counts.instructions += 1;
  }
  return counts;
}

/**
 * Validates one stored note and records its proposals; used at import (with the elements each content line came from) and by the backfill. Decisions already made on another note with the same content (a re-import) are applied again, so a reviewer never answers the same question twice.
 *
 * @example
 * await validateStoredNote(noteId) // { blocks: 21, findings: 1, created: 1, updated: 0, superseded: 0, carriedOver: 0 }
 */
export async function validateStoredNote(
  noteId: string,
  { contentTags }: { contentTags?: readonly string[] } = {},
  db: DbClient = prisma
): Promise<{
  blocks: number;
  findings: number;
  created: number;
  updated: number;
  superseded: number;
  carriedOver: number;
}> {
  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { html: true },
  });
  if (!note) throw new OntologyError(`Unknown note ${noteId}`);
  const blocks = segmentContent(splitStoredContent(note.html));
  await assignContentIndexes(noteId, blocks, { contentTags }, db);
  const { findings } = validateStructure(blocks);
  const saved = await saveStructureFindings(
    noteId,
    findings,
    { supersedeMissing: true },
    db
  );
  const carriedOver =
    saved.created > 0 ? await carryOverStructureDecisions(noteId, db) : 0;
  return {
    blocks: blocks.length,
    findings: findings.length,
    ...saved,
    carriedOver,
  };
}

/**
 * Applies decisions made on other notes with the same content hash to this note's matching open proposals (same position and text). Returns how many were applied; lines that no longer match are left open.
 *
 * @example
 * await carryOverStructureDecisions(reimportedNoteId) // 2
 */
export async function carryOverStructureDecisions(
  noteId: string,
  db: DbClient = prisma
): Promise<number> {
  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { contentHash: true },
  });
  if (!note?.contentHash) return 0;
  const [open, decided] = await Promise.all([
    db.structureProposal.findMany({
      where: { noteId, status: "OPEN" },
      select: {
        id: true,
        contentIndex: true,
        textHash: true,
        proposedLabel: true,
      },
    }),
    db.structureProposal.findMany({
      where: {
        noteId: { not: noteId },
        note: { contentHash: note.contentHash },
        status: { in: ["APPROVED", "REJECTED", "CHANGED"] },
        decidedById: { not: null },
      },
      orderBy: { decidedAt: "desc" },
      select: {
        contentIndex: true,
        textHash: true,
        status: true,
        decidedLabel: true,
        decidedById: true,
      },
    }),
  ]);
  const earlier = new Map<string, (typeof decided)[number]>();
  for (const row of decided) {
    const key = `${row.contentIndex}:${row.textHash}`;
    if (!earlier.has(key)) earlier.set(key, row);
  }
  let applied = 0;
  for (const proposal of open) {
    const previous = earlier.get(
      `${proposal.contentIndex}:${proposal.textHash}`
    );
    if (!previous?.decidedById || !previous.decidedLabel) continue;
    const decision: StructureDecision =
      previous.status === "REJECTED"
        ? { action: "REJECT" }
        : previous.decidedLabel === proposal.proposedLabel
          ? { action: "APPROVE" }
          : { action: "CHANGE", label: previous.decidedLabel as LineLabel };
    try {
      await decideStructureProposal(
        proposal.id,
        decision,
        previous.decidedById
      );
      applied += 1;
    } catch (error) {
      if (!(error instanceof OntologyError)) throw error;
    }
  }
  return applied;
}

/**
 * Validates every unarchived note in id order, resumable with `after` (the last note id of a logged batch). Idempotent: decided proposals are kept, positions already set are kept, and a rerun after a classifier change refreshes open proposals and supersedes ones no longer raised.
 *
 * @example
 * await backfillStructure({ batchSize: 200, onBatch: ({ checkpoint }) => console.log(checkpoint) })
 */
export async function backfillStructure(
  {
    after,
    batchSize = 200,
    onBatch,
  }: {
    after?: string;
    batchSize?: number;
    onBatch?: (progress: {
      notes: number;
      findings: number;
      checkpoint: string;
    }) => void;
  } = {},
  db: DbClient = prisma
): Promise<{
  notes: number;
  findings: number;
  created: number;
  superseded: number;
}> {
  const summary = { notes: 0, findings: 0, created: 0, superseded: 0 };
  let cursor = after;
  for (;;) {
    const notes = await db.note.findMany({
      where: { archivedAt: null, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: batchSize,
      select: { id: true },
    });
    if (notes.length === 0) break;
    for (const note of notes) {
      const result = await validateStoredNote(note.id, {}, db);
      summary.notes += 1;
      summary.findings += result.findings;
      summary.created += result.created;
      summary.superseded += result.superseded;
    }
    cursor = notes[notes.length - 1]?.id;
    if (cursor)
      onBatch?.({
        notes: summary.notes,
        findings: summary.findings,
        checkpoint: cursor,
      });
  }
  return summary;
}

/**
 * A proposal as the review screen shows it, with the lines around it.
 *
 * @example
 * { id: "0193...", noteTitle: "Weeknight Chili", contentIndex: 4, text: "For the sauce:", assignedKind: "INGREDIENT", proposedLabel: "SECTION_HEADING", before: [{ contentIndex: 3, text: "1 tsp salt" }], after: [{ contentIndex: 5, text: "2 tbsp butter" }], ... }
 */
export interface StructureProposalRecord {
  id: string;
  noteId: string;
  noteTitle: string | null;
  contentIndex: number;
  text: string;
  assignedKind: string;
  proposal: z.infer<typeof StructureProposalSchema>;
  proposedLabel: string;
  patternKey: string;
  margin: number;
  signals: z.infer<typeof SignalsSchema>;
  classifierVersion: string;
  status: StructureProposalStatus;
  decidedLabel: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  before: { contentIndex: number; text: string }[];
  after: { contentIndex: number; text: string }[];
}

function surrounding(html: string, contentIndex: number) {
  const lines = splitStoredContent(html);
  const pick = (indexes: number[]) =>
    indexes
      .filter((index) => (lines[index] ?? "").trim() !== "")
      .slice(0, CONTEXT_RADIUS)
      .map((index) => ({
        contentIndex: index,
        text: (lines[index] ?? "").trim(),
      }));
  const before = pick(
    Array.from(
      { length: contentIndex },
      (_, offset) => contentIndex - 1 - offset
    )
  ).reverse();
  const after = pick(
    Array.from(
      { length: Math.max(0, lines.length - contentIndex - 1) },
      (_, offset) => contentIndex + 1 + offset
    )
  );
  return { before, after };
}

const PROPOSAL_SELECT = {
  id: true,
  noteId: true,
  contentIndex: true,
  text: true,
  assignedKind: true,
  proposal: true,
  proposedLabel: true,
  patternKey: true,
  margin: true,
  signals: true,
  classifierVersion: true,
  status: true,
  decidedLabel: true,
  decidedAt: true,
  decidedBy: { select: { username: true } },
  note: { select: { title: true, html: true } },
} satisfies Prisma.StructureProposalSelect;

function toRecord(
  row: Prisma.StructureProposalGetPayload<{ select: typeof PROPOSAL_SELECT }>
): StructureProposalRecord {
  return {
    id: row.id,
    noteId: row.noteId,
    noteTitle: row.note.title,
    contentIndex: row.contentIndex,
    text: row.text,
    assignedKind: row.assignedKind,
    proposal: parseOrThrow(
      StructureProposalSchema,
      row.proposal,
      "StructureProposal.proposal"
    ),
    proposedLabel: row.proposedLabel,
    patternKey: row.patternKey,
    margin: row.margin,
    signals: parseOrThrow(
      SignalsSchema,
      row.signals,
      "StructureProposal.signals"
    ),
    classifierVersion: row.classifierVersion,
    status: row.status,
    decidedLabel: row.decidedLabel,
    decidedBy: row.decidedBy?.username ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    ...surrounding(row.note.html, row.contentIndex),
  };
}

/**
 * One page of proposals, strongest first (open ones by margin; decided ones newest first). Archived notes are left out.
 *
 * @example
 * await listStructureProposals({ status: "OPEN", patternKey: "SECTION_HEADING:COLON_HEADING" })
 */
export async function listStructureProposals(
  {
    status = "OPEN",
    patternKey,
    offset = 0,
    limit = 25,
  }: {
    status?: StructureProposalStatus | "DECIDED";
    patternKey?: string;
    offset?: number;
    limit?: number;
  } = {},
  db: DbClient = prisma
): Promise<{ items: StructureProposalRecord[]; total: number }> {
  const where: Prisma.StructureProposalWhereInput = {
    note: { archivedAt: null },
    ...(status === "DECIDED"
      ? { status: { in: ["APPROVED", "REJECTED", "CHANGED"] } }
      : { status }),
    ...(patternKey ? { patternKey } : {}),
  };
  const [rows, total] = await Promise.all([
    db.structureProposal.findMany({
      where,
      orderBy:
        status === "OPEN"
          ? [{ margin: "desc" }, { id: "asc" }]
          : [{ decidedAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: PROPOSAL_SELECT,
    }),
    db.structureProposal.count({ where }),
  ]);
  return { items: rows.map(toRecord), total };
}

/**
 * @example
 * await getStructureProposal(id) // { text: "For the sauce:", status: "OPEN", ... } or null
 */
export async function getStructureProposal(
  id: string,
  db: DbClient = prisma
): Promise<StructureProposalRecord | null> {
  const row = await db.structureProposal.findUnique({
    where: { id },
    select: PROPOSAL_SELECT,
  });
  return row ? toRecord(row) : null;
}

/**
 * How one pattern has fared in review, and whether it may be applied automatically.
 *
 * @example
 * { patternKey: "SECTION_HEADING:COLON_HEADING", open: 12, approved: 51, rejected: 0, changed: 1, notes: 40, precision: 0.981, scope: "GENERAL", topSource: { label: "Bon Appétit", share: 0.3 }, canAutoApply: true }
 */
export interface StructurePatternRecord {
  patternKey: string;
  proposedLabel: string;
  open: number;
  approved: number;
  rejected: number;
  changed: number;
  notes: number;
  /** Approved over decided; null before any decision. */
  precision: number | null;
  /** GENERAL (across sources), SOURCE_SPECIFIC (most decisions from one source), ONE_OFF (a single note), or UNDECIDED (fewer than three decisions). */
  scope: "GENERAL" | "SOURCE_SPECIFIC" | "ONE_OFF" | "UNDECIDED";
  topSource: { label: string; share: number } | null;
  canAutoApply: boolean;
}

/**
 * Review outcomes per pattern (Phase 8.5-E), most proposals first: how often reviewers approved, rejected, or changed it, how many notes it spans, which source dominates its decisions, and whether its precision clears the bar for automatic application (98% over at least 50 decisions).
 *
 * @example
 * await getStructurePatterns() // [{ patternKey: "SECTION_HEADING:COLON_HEADING", precision: 0.981, canAutoApply: true, ... }]
 */
export async function getStructurePatterns(
  db: DbClient = prisma
): Promise<StructurePatternRecord[]> {
  const [counts, sources] = await Promise.all([
    db.$queryRaw<
      {
        patternKey: string;
        proposedLabel: string;
        open: bigint;
        approved: bigint;
        rejected: bigint;
        changed: bigint;
        notes: bigint;
        decidedNotes: bigint;
      }[]
    >`
      SELECT p."patternKey", MIN(p."proposedLabel") AS "proposedLabel",
             COUNT(*) FILTER (WHERE p.status = 'OPEN') AS open,
             COUNT(*) FILTER (WHERE p.status = 'APPROVED') AS approved,
             COUNT(*) FILTER (WHERE p.status = 'REJECTED') AS rejected,
             COUNT(*) FILTER (WHERE p.status = 'CHANGED') AS changed,
             COUNT(DISTINCT p."noteId") AS notes,
             COUNT(DISTINCT p."noteId") FILTER (WHERE p.status IN ('APPROVED', 'REJECTED', 'CHANGED')) AS "decidedNotes"
      FROM "StructureProposal" p
      JOIN "Note" n ON n.id = p."noteId"
      WHERE n."archivedAt" IS NULL AND p.status <> 'SUPERSEDED'
      GROUP BY p."patternKey"
    `,
    db.$queryRaw<{ patternKey: string; label: string; decided: bigint }[]>`
      SELECT p."patternKey", COALESCE(s."displayName", b.title, u."normalizedUrl", s."canonicalKey") AS label, COUNT(*) AS decided
      FROM "StructureProposal" p
      JOIN "NoteSource" ns ON ns."noteId" = p."noteId" AND ns."isPrimary" = true
      JOIN "Source" s ON s.id = ns."sourceId"
      LEFT JOIN "Book" b ON b.id = s."bookId"
      LEFT JOIN "URL" u ON u."sourceId" = s.id
      WHERE p.status IN ('APPROVED', 'REJECTED', 'CHANGED')
      GROUP BY p."patternKey", label
    `,
  ]);
  const topSources = new Map<string, { label: string; decided: number }>();
  for (const row of sources) {
    const current = topSources.get(row.patternKey);
    if (!current || Number(row.decided) > current.decided)
      topSources.set(row.patternKey, {
        label: row.label,
        decided: Number(row.decided),
      });
  }
  return counts
    .map((row): StructurePatternRecord => {
      const approved = Number(row.approved);
      const decided = approved + Number(row.rejected) + Number(row.changed);
      const precision = decided === 0 ? null : approved / decided;
      const top = topSources.get(row.patternKey);
      const share = top && decided > 0 ? top.decided / decided : null;
      const scope =
        decided < 3
          ? "UNDECIDED"
          : Number(row.decidedNotes) === 1
            ? "ONE_OFF"
            : share !== null && share >= 0.8
              ? "SOURCE_SPECIFIC"
              : "GENERAL";
      return {
        patternKey: row.patternKey,
        proposedLabel: row.proposedLabel,
        open: Number(row.open),
        approved,
        rejected: Number(row.rejected),
        changed: Number(row.changed),
        notes: Number(row.notes),
        precision,
        scope,
        topSource: top && share !== null ? { label: top.label, share } : null,
        canAutoApply:
          precision !== null &&
          precision >= AUTO_APPLY_MIN_PRECISION &&
          decided >= AUTO_APPLY_MIN_DECISIONS,
      };
    })
    .sort(
      (a, b) =>
        b.open +
          b.approved +
          b.rejected +
          b.changed -
          (a.open + a.approved + a.rejected + a.changed) ||
        a.patternKey.localeCompare(b.patternKey)
    );
}

/**
 * Open proposals in total and per pattern, for the Structure tab's filters.
 *
 * @example
 * await getStructureCounts() // { open: 14, decided: 51, byPattern: [{ patternKey: "SECTION_HEADING:COLON_HEADING", open: 9 }] }
 */
export async function getStructureCounts(db: DbClient = prisma): Promise<{
  open: number;
  decided: number;
  byPattern: { patternKey: string; open: number }[];
}> {
  const live = {
    note: { archivedAt: null },
  } satisfies Prisma.StructureProposalWhereInput;
  const [open, decided, byPattern] = await Promise.all([
    db.structureProposal.count({ where: { ...live, status: "OPEN" } }),
    db.structureProposal.count({
      where: { ...live, status: { in: ["APPROVED", "REJECTED", "CHANGED"] } },
    }),
    db.structureProposal.groupBy({
      by: ["patternKey"],
      where: { ...live, status: "OPEN" },
      _count: { _all: true },
      orderBy: { patternKey: "asc" },
    }),
  ]);
  return {
    open,
    decided,
    byPattern: byPattern
      .map((row) => ({ patternKey: row.patternKey, open: row._count._all }))
      .sort(
        (a, b) => b.open - a.open || a.patternKey.localeCompare(b.patternKey)
      ),
  };
}

const EffectSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("updateIngredient"),
    id: z.string(),
    before: z.object({
      lineKind: z.enum(LINE_LABELS),
      isActive: z.boolean(),
      reference: z.string().optional(),
    }),
  }),
  z.object({
    op: z.literal("updateInstruction"),
    id: z.string(),
    before: z.object({
      lineKind: z.enum(LINE_LABELS),
      isActive: z.boolean(),
      originalText: z.string().optional(),
    }),
  }),
  z.object({ op: z.literal("createIngredient"), id: z.string() }),
  z.object({ op: z.literal("createInstruction"), id: z.string() }),
  z.object({
    op: z.literal("shiftIngredients"),
    noteId: z.string(),
    blockIndex: z.number().int(),
    fromLineIndex: z.number().int(),
  }),
  z.object({
    op: z.literal("shiftInstructions"),
    noteId: z.string(),
    fromLineIndex: z.number().int(),
    excludeId: z.string(),
  }),
]);
const EffectsSchema = z.array(EffectSchema);
type StructureEffect = z.infer<typeof EffectSchema>;

/**
 * A reviewer's answer to a proposal: take it, turn it down, or file the line as another kind.
 *
 * @example
 * { action: "APPROVE" }
 * { action: "CHANGE", label: "NOTE" }
 */
export type StructureDecision =
  | { action: "APPROVE" }
  | { action: "REJECT" }
  | { action: "CHANGE"; label: LineLabel };

async function findLine(
  tx: DbClient,
  proposal: {
    noteId: string;
    contentIndex: number;
    text: string;
    assignedKind: string;
  }
) {
  if (proposal.assignedKind === "INGREDIENT") {
    const line =
      (await tx.parsedIngredientLine.findFirst({
        where: {
          noteId: proposal.noteId,
          contentIndex: proposal.contentIndex,
          isActive: true,
        },
      })) ??
      (await tx.parsedIngredientLine.findFirst({
        where: {
          noteId: proposal.noteId,
          reference: proposal.text,
          isActive: true,
        },
      }));
    return line ? { table: "ingredient" as const, line } : null;
  }
  const line =
    (await tx.parsedInstructionLine.findFirst({
      where: {
        noteId: proposal.noteId,
        contentIndex: proposal.contentIndex,
        isActive: true,
      },
    })) ??
    (await tx.parsedInstructionLine.findFirst({
      where: {
        noteId: proposal.noteId,
        originalText: proposal.text,
        isActive: true,
      },
    }));
  return line ? { table: "instruction" as const, line } : null;
}

async function reparseIngredientLine(
  tx: DbClient,
  lineId: string,
  context: ResolverContext
): Promise<void> {
  const line = await tx.parsedIngredientLine.findUniqueOrThrow({
    where: { id: lineId },
    select: { id: true, reference: true, noteId: true },
  });
  await writeProcessedLines(
    tx,
    [{ line, result: processIngredientLine(line.reference, context) }],
    context
  );
  await tx.parsedIngredientLine.update({
    where: { id: lineId },
    data: {
      parseStatus: "COMPLETED_SUCCESSFULLY",
      parsedAt: new Date(),
      parserVersion: PARSER_TAG,
    },
  });
}

/** Instructions in reading order: by content position when every row has one, otherwise as stored with new rows last. */
async function reindexInstructions(
  tx: DbClient,
  noteId: string
): Promise<void> {
  const rows = await tx.parsedInstructionLine.findMany({
    where: { noteId },
    select: { id: true, lineIndex: true, contentIndex: true },
    orderBy: [{ lineIndex: "asc" }, { id: "asc" }],
  });
  const ordered = rows.every((row) => row.contentIndex !== null)
    ? [...rows].sort((a, b) => (a.contentIndex ?? 0) - (b.contentIndex ?? 0))
    : rows;
  for (const [index, row] of ordered.entries())
    if (row.lineIndex !== index)
      await tx.parsedInstructionLine.update({
        where: { id: row.id },
        data: { lineIndex: index },
      });
}

async function shiftIngredientLines(
  tx: DbClient,
  noteId: string,
  blockIndex: number,
  fromLineIndex: number,
  by: 1 | -1
) {
  const threshold = by === 1 ? fromLineIndex : fromLineIndex + 1;
  // Two steps through negative indexes, so the (note, block, line) unique key never collides mid-update.
  await tx.$executeRaw`
    UPDATE "ParsedIngredientLine" SET "lineIndex" = -("lineIndex" + 1)
    WHERE "noteId" = ${noteId} AND "blockIndex" = ${blockIndex} AND "lineIndex" >= ${threshold}
  `;
  await tx.$executeRaw`
    UPDATE "ParsedIngredientLine" SET "lineIndex" = -"lineIndex" - 1 + ${by}
    WHERE "noteId" = ${noteId} AND "blockIndex" = ${blockIndex} AND "lineIndex" < 0
  `;
}

/**
 * Applies a reviewer's decision in one transaction and records every row it wrote, so `undoStructureDecision` can reverse exactly that. A heading, note, or other text becomes an inactive line of that kind (kept in place, out of mentions and counts); a line moved to the other list leaves its original row inactive and adds a row there (an ingredient is parsed and resolved right away); a split keeps the text after the heading on the line and adds the heading before it. Rejecting, or changing a line to the kind it already has, writes nothing but the decision. Repeating the same decision does nothing; a different one needs an undo first.
 *
 * @example
 * await decideStructureProposal(proposalId, { action: "APPROVE" }, userId)
 * await decideStructureProposal(proposalId, { action: "CHANGE", label: "NOTE" }, userId)
 */
export async function decideStructureProposal(
  proposalId: string,
  decision: StructureDecision,
  userId: string,
  { context }: { context?: ResolverContext } = {}
): Promise<StructureProposalRecord> {
  const proposal = await prisma.structureProposal.findUnique({
    where: { id: proposalId },
  });
  if (!proposal) throw new OntologyError("Unknown structure proposal");
  const parsed = parseOrThrow(
    StructureProposalSchema,
    proposal.proposal,
    "StructureProposal.proposal"
  );
  const label =
    decision.action === "APPROVE"
      ? proposal.proposedLabel
      : decision.action === "CHANGE"
        ? decision.label
        : proposal.assignedKind;
  const status: StructureProposalStatus =
    label === proposal.assignedKind
      ? "REJECTED"
      : decision.action === "APPROVE"
        ? "APPROVED"
        : "CHANGED";

  if (proposal.status !== "OPEN") {
    if (proposal.status === status && proposal.decidedLabel === label)
      return (await getStructureProposal(
        proposalId
      )) as StructureProposalRecord;
    throw new OntologyError("This line was already decided; undo that first");
  }

  const resolverContext =
    status === "REJECTED" ? null : (context ?? (await loadResolverContext()));
  await prisma.$transaction(
    async (tx) => {
      const effects: StructureEffect[] = [];
      if (status !== "REJECTED") {
        const found = await findLine(tx, proposal);
        if (!found)
          throw new OntologyError(
            "The line is no longer in this note as filed"
          );
        const reparse: string[] = [];
        const isSplit = label.includes("+");

        if (isSplit) {
          if (parsed.type !== "SPLIT")
            throw new OntologyError("Only a split proposal can be split");
          const [heading, rest] = parsed.parts;
          if (!heading || !rest || rest.kind !== proposal.assignedKind)
            throw new OntologyError(
              "Splitting into the other list isn't supported yet; choose one kind instead"
            );
          if (found.table === "ingredient") {
            const line = found.line;
            await shiftIngredientLines(
              tx,
              proposal.noteId,
              line.blockIndex,
              line.lineIndex,
              1
            );
            effects.push({
              op: "shiftIngredients",
              noteId: proposal.noteId,
              blockIndex: line.blockIndex,
              fromLineIndex: line.lineIndex,
            });
            await tx.parsedIngredientLine.update({
              where: { id: line.id },
              data: { reference: rest.text },
            });
            effects.push({
              op: "updateIngredient",
              id: line.id,
              before: {
                lineKind: line.lineKind,
                isActive: line.isActive,
                reference: line.reference,
              },
            });
            const created = await tx.parsedIngredientLine.create({
              data: {
                noteId: proposal.noteId,
                blockIndex: line.blockIndex,
                lineIndex: line.lineIndex,
                reference: heading.text,
                contentIndex: line.contentIndex,
                lineKind: "SECTION_HEADING",
                isActive: false,
                parseStatus: "COMPLETED_SUCCESSFULLY",
              },
            });
            effects.push({ op: "createIngredient", id: created.id });
            reparse.push(line.id);
          } else {
            const line = found.line;
            await tx.parsedInstructionLine.update({
              where: { id: line.id },
              data: { originalText: rest.text },
            });
            effects.push({
              op: "updateInstruction",
              id: line.id,
              before: {
                lineKind: line.lineKind,
                isActive: line.isActive,
                originalText: line.originalText,
              },
            });
            const created = await tx.parsedInstructionLine.create({
              data: {
                noteId: proposal.noteId,
                lineIndex: line.lineIndex,
                originalText: heading.text,
                contentIndex: line.contentIndex,
                lineKind: "SECTION_HEADING",
                isActive: false,
              },
            });
            await tx.$executeRaw`
              UPDATE "ParsedInstructionLine" SET "lineIndex" = "lineIndex" + 1
              WHERE "noteId" = ${proposal.noteId} AND "lineIndex" >= ${line.lineIndex} AND id <> ${created.id}
            `;
            effects.push({
              op: "shiftInstructions",
              noteId: proposal.noteId,
              fromLineIndex: line.lineIndex,
              excludeId: created.id,
            });
            effects.push({ op: "createInstruction", id: created.id });
          }
        } else if (found.table === "ingredient") {
          const line = found.line;
          await tx.parsedIngredientLine.update({
            where: { id: line.id },
            data: { lineKind: label as LineLabel, isActive: false },
          });
          effects.push({
            op: "updateIngredient",
            id: line.id,
            before: { lineKind: line.lineKind, isActive: line.isActive },
          });
          if (label === "INSTRUCTION") {
            const created = await tx.parsedInstructionLine.create({
              data: {
                noteId: proposal.noteId,
                lineIndex: 1_000_000,
                originalText: line.reference,
                contentIndex: line.contentIndex ?? proposal.contentIndex,
                lineKind: "INSTRUCTION",
              },
            });
            effects.push({ op: "createInstruction", id: created.id });
            await reindexInstructions(tx, proposal.noteId);
          }
        } else {
          const line = found.line;
          await tx.parsedInstructionLine.update({
            where: { id: line.id },
            data: { lineKind: label as LineLabel, isActive: false },
          });
          effects.push({
            op: "updateInstruction",
            id: line.id,
            before: { lineKind: line.lineKind, isActive: line.isActive },
          });
          if (label === "INGREDIENT") {
            const last = await tx.parsedIngredientLine.aggregate({
              where: { noteId: proposal.noteId },
              _max: { blockIndex: true },
            });
            const created = await tx.parsedIngredientLine.create({
              data: {
                noteId: proposal.noteId,
                blockIndex: (last._max.blockIndex ?? -1) + 1,
                lineIndex: 0,
                reference: line.originalText,
                contentIndex: line.contentIndex ?? proposal.contentIndex,
                lineKind: "INGREDIENT",
              },
            });
            effects.push({ op: "createIngredient", id: created.id });
            reparse.push(created.id);
          }
        }

        if (resolverContext)
          for (const lineId of reparse)
            await reparseIngredientLine(tx, lineId, resolverContext);
      }
      await tx.structureProposal.update({
        where: { id: proposalId },
        data: {
          status,
          decidedLabel: label,
          decidedById: userId,
          decidedAt: new Date(),
          effects:
            effects.length > 0
              ? toJson(
                  parseOrThrow(
                    EffectsSchema,
                    effects,
                    "StructureProposal.effects"
                  )
                )
              : Prisma.DbNull,
        },
      });
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
  return (await getStructureProposal(proposalId)) as StructureProposalRecord;
}

/**
 * Reverses a decision, newest effect first, re-reading any ingredient line whose text it restores, and puts the proposal back in review.
 *
 * @example
 * await undoStructureDecision(proposalId)
 */
export async function undoStructureDecision(
  proposalId: string,
  { context }: { context?: ResolverContext } = {}
): Promise<StructureProposalRecord> {
  const proposal = await prisma.structureProposal.findUnique({
    where: { id: proposalId },
  });
  if (!proposal) throw new OntologyError("Unknown structure proposal");
  if (proposal.status === "OPEN")
    return (await getStructureProposal(proposalId)) as StructureProposalRecord;
  if (proposal.status === "SUPERSEDED")
    throw new OntologyError("A superseded proposal has no decision to undo");
  const effects = proposal.effects
    ? parseOrThrow(EffectsSchema, proposal.effects, "StructureProposal.effects")
    : [];
  const needsReparse = effects.some(
    (effect) =>
      effect.op === "updateIngredient" && effect.before.reference !== undefined
  );
  const resolverContext = needsReparse
    ? (context ?? (await loadResolverContext()))
    : null;

  await prisma.$transaction(
    async (tx) => {
      const reparse: string[] = [];
      for (const effect of [...effects].reverse()) {
        switch (effect.op) {
          case "createIngredient":
            await tx.parsedIngredientLine.delete({ where: { id: effect.id } });
            break;
          case "createInstruction":
            await tx.parsedInstructionLine.delete({ where: { id: effect.id } });
            break;
          case "updateIngredient":
            await tx.parsedIngredientLine.update({
              where: { id: effect.id },
              data: effect.before,
            });
            if (effect.before.reference !== undefined) reparse.push(effect.id);
            break;
          case "updateInstruction":
            await tx.parsedInstructionLine.update({
              where: { id: effect.id },
              data: effect.before,
            });
            break;
          case "shiftIngredients":
            await shiftIngredientLines(
              tx,
              effect.noteId,
              effect.blockIndex,
              effect.fromLineIndex,
              -1
            );
            break;
          case "shiftInstructions":
            await tx.$executeRaw`
              UPDATE "ParsedInstructionLine" SET "lineIndex" = "lineIndex" - 1
              WHERE "noteId" = ${effect.noteId} AND "lineIndex" > ${effect.fromLineIndex}
            `;
            break;
        }
      }
      if (effects.some((effect) => effect.op === "createInstruction"))
        await reindexInstructions(tx, proposal.noteId);
      if (resolverContext)
        for (const lineId of reparse)
          await reparseIngredientLine(tx, lineId, resolverContext);
      await tx.structureProposal.update({
        where: { id: proposalId },
        data: {
          status: "OPEN",
          decidedLabel: null,
          decidedById: null,
          decidedAt: null,
          effects: Prisma.DbNull,
        },
      });
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
  return (await getStructureProposal(proposalId)) as StructureProposalRecord;
}

/**
 * Applies one decision to every open proposal of a pattern, one transaction each; proposals whose line changed since are skipped and counted. With `requirePrecision` (automatic use, as in `reclassify:structure`) it refuses unless the pattern's review precision clears 98% over at least 50 decisions.
 *
 * @example
 * await decideStructurePattern("SECTION_HEADING:COLON_HEADING", { action: "APPROVE" }, userId) // { applied: 9, skipped: 0 }
 */
export async function decideStructurePattern(
  patternKey: string,
  decision: StructureDecision,
  userId: string,
  {
    requirePrecision = false,
    context,
  }: { requirePrecision?: boolean; context?: ResolverContext } = {}
): Promise<{ applied: number; skipped: number }> {
  if (requirePrecision) {
    const pattern = (await getStructurePatterns()).find(
      (row) => row.patternKey === patternKey
    );
    if (!pattern?.canAutoApply)
      throw new OntologyError(
        `Pattern ${patternKey} hasn't earned automatic application (needs ${AUTO_APPLY_MIN_PRECISION * 100}% precision over ${AUTO_APPLY_MIN_DECISIONS} decisions)`
      );
  }
  const open = await prisma.structureProposal.findMany({
    where: { patternKey, status: "OPEN", note: { archivedAt: null } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  const resolverContext = context ?? (await loadResolverContext());
  const result = { applied: 0, skipped: 0 };
  for (const { id } of open) {
    try {
      await decideStructureProposal(id, decision, userId, {
        context: resolverContext,
      });
      result.applied += 1;
    } catch (error) {
      if (!(error instanceof OntologyError)) throw error;
      result.skipped += 1;
    }
  }
  return result;
}

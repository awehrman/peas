import {
  type DbClient,
  type LexiconTarget,
  OntologyError,
  computeTargetKey,
} from "./helpers.js";
import { getCurrentRevision } from "./revision.js";

import {
  type LexiconEntryInput,
  NORMALIZER_VERSION,
  entryMatchKey,
  entryTokenKeys,
  normalizeText,
} from "@peas/parser/v2";
import type {
  EntryStatus,
  LexiconRole,
  LexiconTermKind,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../client.js";

export interface LexiconSnapshotRecord {
  revision: number;
  entries: LexiconEntryInput[];
}

/**
 * The lexicon as the v2 parser consumes it (`buildLexicon(snapshot)`). Deprecated entries are never included; proposed ones only when exploring.
 *
 * @example
 * const snapshot = await getLexiconSnapshot();
 * // { revision: 3, entries: [{ id: "0193...", text: "chicken thighs", role: "FOOD", status: "ACTIVE" }, ...] }
 * const tree = parseLineBest("1 lb chicken thighs", { lexicon: buildLexicon(snapshot) });
 */
export async function getLexiconSnapshot(
  { includeProposed = false }: { includeProposed?: boolean } = {},
  db: DbClient = prisma
): Promise<LexiconSnapshotRecord> {
  const statuses: EntryStatus[] = includeProposed
    ? ["ACTIVE", "PROPOSED"]
    : ["ACTIVE"];
  const [revision, rows] = await Promise.all([
    getCurrentRevision(db),
    db.lexiconEntry.findMany({
      where: { status: { in: statuses } },
      select: { id: true, text: true, role: true, status: true },
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    revision,
    entries: rows.map((row) => ({
      id: row.id,
      text: row.text,
      role: row.role,
      status: row.status === "PROPOSED" ? "PROPOSED" : "ACTIVE",
    })),
  };
}

/**
 * One entry to create. The target fields must match the role (enforced again by a CHECK constraint).
 *
 * @example
 * { text: "chicken thighs", role: "FOOD", kind: "PLURAL", conceptId: "<chicken thigh>", status: "ACTIVE" }
 * { text: "finely", role: "DEGREE", valueKey: "fine" }
 */
export interface LexiconEntryCreateInput extends LexiconTarget {
  text: string;
  kind?: LexiconTermKind | null;
  locale?: string | null;
  status?: EntryStatus;
  decisionId?: string | null;
}

export interface CreatedLexiconEntry {
  id: string;
  matchKey: string;
  targetKey: string;
  /** False when an entry with the same matchKey and target already existed. */
  created: boolean;
}

/**
 * Creates entries in the caller's transaction, computing `normalized`, `matchKey`, `tokenCount`, and `targetKey`. An input that duplicates an existing (matchKey, targetKey) returns the existing id instead of failing, so seeds and decisions can be replayed.
 *
 * @example
 * await createLexiconEntries(tx, [{ text: "Chicken Thighs", role: "FOOD", kind: "PLURAL", conceptId }], revision)
 * // [{ id: "0193...", matchKey: "chicken thighs", targetKey: "food:<conceptId>", created: true }]
 */
export async function createLexiconEntries(
  tx: DbClient,
  inputs: readonly LexiconEntryCreateInput[],
  revision: number
): Promise<CreatedLexiconEntry[]> {
  const results: CreatedLexiconEntry[] = [];

  for (const input of inputs) {
    const text = input.text.trim();
    const tokenCount = entryTokenKeys(text).length;
    if (tokenCount === 0)
      throw new OntologyError(
        `Lexicon entry text "${input.text}" has no tokens`
      );
    if (input.kind && input.role !== "FOOD") {
      throw new OntologyError(
        `Only FOOD entries have a kind; "${text}" is ${input.role}`
      );
    }

    const matchKey = entryMatchKey(text);
    const targetKey = computeTargetKey(input);
    const existing = await tx.lexiconEntry.findUnique({
      where: { matchKey_targetKey: { matchKey, targetKey } },
      select: { id: true },
    });
    if (existing) {
      results.push({ id: existing.id, matchKey, targetKey, created: false });
      continue;
    }

    const row = await tx.lexiconEntry.create({
      data: {
        text,
        normalized: normalizeText(text).text,
        matchKey,
        tokenCount,
        role: input.role,
        kind: input.kind ?? null,
        locale: input.locale ?? null,
        status: input.status ?? "PROPOSED",
        conceptId: input.role === "FOOD" ? (input.conceptId ?? null) : null,
        attributeValueId:
          input.role === "ATTRIBUTE" ? (input.attributeValueId ?? null) : null,
        preparationId:
          input.role === "PREPARATION" ? (input.preparationId ?? null) : null,
        valueKey: ["DEGREE", "MEASUREMENT_MODIFIER", "INSTRUCTION"].includes(
          input.role
        )
          ? (input.valueKey ?? null)
          : null,
        targetKey,
        normalizerVersion: NORMALIZER_VERSION,
        revisionAdded: revision,
        decisionId: input.decisionId ?? null,
      },
      select: { id: true },
    });
    results.push({ id: row.id, matchKey, targetKey, created: true });
  }

  return results;
}

/**
 * Retires entries at a revision. They stay in the table for history and REVERT but leave every snapshot.
 *
 * @example
 * await deprecateLexiconEntries(tx, [entryId], revision) // 1
 */
export async function deprecateLexiconEntries(
  tx: DbClient,
  ids: readonly string[],
  revision: number
): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await tx.lexiconEntry.updateMany({
    where: { id: { in: [...ids] }, status: { not: "DEPRECATED" } },
    data: { status: "DEPRECATED", revisionRetired: revision },
  });
  return result.count;
}

export interface LexiconEntryRefRecord {
  id: string;
  text: string;
  role: LexiconEntryInput["role"];
  kind: LexiconTermKind | null;
  status: EntryStatus;
  conceptId: string | null;
  attributeValueId: string | null;
  /** Readable target: concept name, "definition: value", preparation key, or value key. */
  targetLabel: string;
}

/**
 * Entries with readable targets, for labelling the entry ids a discovery names.
 *
 * @example
 * await getLexiconEntryRefs([greenColor, greenRipeness])
 * // [{ text: "green", role: "ATTRIBUTE", targetLabel: "color: green" }, { text: "green", role: "ATTRIBUTE", targetLabel: "ripeness: unripe" }]
 */
const ENTRY_REF_SELECT = {
  id: true,
  text: true,
  role: true,
  kind: true,
  status: true,
  conceptId: true,
  attributeValueId: true,
  valueKey: true,
  concept: { select: { canonicalName: true } },
  attributeValue: {
    select: { key: true, definition: { select: { key: true } } },
  },
  preparation: { select: { key: true } },
} as const;

type EntryRefRow = Prisma.LexiconEntryGetPayload<{ select: typeof ENTRY_REF_SELECT }>;

function toEntryRef(row: EntryRefRow): LexiconEntryRefRecord {
  return {
    id: row.id,
    text: row.text,
    role: row.role,
    kind: row.kind,
    status: row.status,
    conceptId: row.conceptId,
    attributeValueId: row.attributeValueId,
    targetLabel:
      row.concept?.canonicalName ??
      (row.attributeValue
        ? `${row.attributeValue.definition.key}: ${row.attributeValue.key}`
        : (row.preparation?.key ?? row.valueKey ?? "")),
  };
}

export async function getLexiconEntryRefs(
  ids: readonly string[],
  db: DbClient = prisma
): Promise<LexiconEntryRefRecord[]> {
  if (ids.length === 0) return [];
  const rows = await db.lexiconEntry.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: ENTRY_REF_SELECT,
  });
  return rows.map(toEntryRef);
}

/**
 * One page of the lexicon for the Knowledge section: every name and modifier Peas knows, alphabetical, filtered by text and role. Retired (DEPRECATED) entries are hidden.
 *
 * @example
 * await listLexiconEntries({ query: "chicken", role: "FOOD" }) // { items: [{ text: "chicken thighs", kind: "PLURAL", targetLabel: "chicken thigh" }, ...], total: 9 }
 */
export async function listLexiconEntries(
  {
    query,
    role,
    offset = 0,
    limit = 50,
  }: { query?: string; role?: LexiconRole; offset?: number; limit?: number } = {},
  db: DbClient = prisma
): Promise<{ items: LexiconEntryRefRecord[]; total: number }> {
  const trimmed = query?.trim();
  const where: Prisma.LexiconEntryWhereInput = {
    status: { not: "DEPRECATED" },
    ...(role ? { role } : {}),
    ...(trimmed ? { normalized: { contains: trimmed, mode: "insensitive" } } : {}),
  };
  const [rows, total] = await Promise.all([
    db.lexiconEntry.findMany({
      where,
      orderBy: [{ normalized: "asc" }, { role: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: ENTRY_REF_SELECT,
    }),
    db.lexiconEntry.count({ where }),
  ]);
  return { items: rows.map(toEntryRef), total };
}

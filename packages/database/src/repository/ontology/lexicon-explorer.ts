import { type DbClient, OntologyError } from "./helpers.js";
import { type LexiconEntryRefRecord, getLexiconEntryRefs } from "./lexicon.js";

import { type DiscoveryType, Prisma } from "@prisma/client";

import { prisma } from "../../client.js";

const SOURCE_LABEL = Prisma.sql`COALESCE(s."displayName", b.title, u."normalizedUrl", s."canonicalKey")`;

/** Discovery types that name an expression Peas doesn't understand yet. */
export const UNKNOWN_EXPRESSION_TYPES = [
  "UNKNOWN_FOOD_PHRASE",
  "UNKNOWN_MODIFIER",
  "AMBIGUOUS_MATCH",
] as const satisfies readonly DiscoveryType[];
export type UnknownExpressionType = (typeof UNKNOWN_EXPRESSION_TYPES)[number];

/**
 * A lexicon entry with when it was added and retired.
 *
 * @example
 * { id: "0193...", text: "chicken thighs", role: "FOOD", kind: "PLURAL", targetLabel: "chicken thigh", revisionAdded: 3, revisionRetired: null, createdAt: "2026-11-12T..." }
 */
export interface LexiconEntryDetailRecord extends LexiconEntryRefRecord {
  revisionAdded: number;
  revisionRetired: number | null;
  createdAt: string;
}

/**
 * @example
 * await getLexiconEntryDetail(entryId) // { text: "chicken thighs", revisionAdded: 3, ... }
 */
export async function getLexiconEntryDetail(
  entryId: string,
  db: DbClient = prisma
): Promise<LexiconEntryDetailRecord | null> {
  const [ref] = await getLexiconEntryRefs([entryId], db);
  if (!ref) return null;
  const row = await db.lexiconEntry.findUniqueOrThrow({
    where: { id: entryId },
    select: { revisionAdded: true, revisionRetired: true, createdAt: true },
  });
  return {
    ...ref,
    revisionAdded: row.revisionAdded,
    revisionRetired: row.revisionRetired,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * A line where the parser matched a lexicon entry, with the matched words.
 *
 * @example
 * { mentionId: "0193...", lineText: "1 lb boneless chicken thighs", span: { start: 14, end: 28, text: "chicken thighs" }, noteId: "cm3n...", noteTitle: "Braised thighs", recipeId: null, recipeTitle: null, conceptName: "chicken thigh", status: "AUTO_RESOLVED" }
 */
export interface LexiconOccurrence {
  mentionId: string;
  lineText: string;
  span: { start: number; end: number; text: string } | null;
  noteId: string;
  noteTitle: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  /** The concept the mention resolved to, if any. */
  conceptName: string | null;
  status: string;
}

export interface LexiconOccurrencePage {
  items: LexiconOccurrence[];
  total: number;
  nextCursor: string | null;
}

/** The longest word of the match key, as a cheap ILIKE prefilter before the exact syntax check. */
function prefilterWord(matchKey: string): string {
  return (
    matchKey
      .split(" ")
      .filter((token) => /\p{L}/u.test(token))
      .sort((a, b) => b.length - a.length)[0] ?? matchKey
  );
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lines in active, unarchived notes whose stored syntax used the entry (any role), oldest mention first. Mentions are first narrowed by the entry's longest word, then checked exactly against the lexemes' entry ids, so a "salt and pepper" segment lists each part under its own word. Pages are keyset-based on the mention id.
 *
 * @example
 * const first = await listLexiconEntryOccurrences(chickenThighsEntryId, { limit: 50 });
 * const next = await listLexiconEntryOccurrences(chickenThighsEntryId, { after: first.nextCursor });
 */
export async function listLexiconEntryOccurrences(
  entryId: string,
  { after, limit = 50 }: { after?: string | null; limit?: number } = {},
  db: DbClient = prisma
): Promise<LexiconOccurrencePage> {
  if (after && !UUID.test(after))
    throw new OntologyError("Invalid occurrence cursor");
  const entry = await db.lexiconEntry.findUnique({
    where: { id: entryId },
    select: { matchKey: true },
  });
  if (!entry) return { items: [], total: 0, nextCursor: null };

  const vars = JSON.stringify({ id: entryId });
  const path = "$.segment.** ? (@.entryIds[*] == $id)";
  const from = Prisma.sql`
    FROM "IngredientMention" m
    JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
    JOIN "Note" n ON n.id = l."noteId"
  `;
  const where = Prisma.sql`
    WHERE l."isActive" = true
      AND n."archivedAt" IS NULL
      AND m."normalizedText" ILIKE ${`%${escapeLike(prefilterWord(entry.matchKey))}%`}
      AND jsonb_path_exists(m.syntax, ${path}::jsonpath, ${vars}::jsonb)
  `;
  const afterId = after ? Prisma.sql`AND m.id > ${after}::uuid` : Prisma.empty;

  const [rows, totals] = await Promise.all([
    db.$queryRaw<
      {
        mentionId: string;
        lineText: string;
        span: { start: number; end: number; text: string } | null;
        noteId: string;
        noteTitle: string | null;
        recipeId: string | null;
        recipeTitle: string | null;
        conceptName: string | null;
        status: string;
      }[]
    >`
      SELECT m.id::text AS "mentionId", l.reference AS "lineText",
             jsonb_path_query_first(m.syntax, ${`${path}.span`}::jsonpath, ${vars}::jsonb) AS span,
             n.id AS "noteId", n.title AS "noteTitle", r.id AS "recipeId", r.title AS "recipeTitle",
             c."canonicalName" AS "conceptName", m."resolutionStatus"::text AS status
      ${from}
      LEFT JOIN "Recipe" r ON r."noteId" = n.id
      LEFT JOIN "FoodConcept" c ON c.id = m."conceptId"
      ${where} ${afterId}
      ORDER BY m.id
      LIMIT ${limit + 1}
    `,
    db.$queryRaw<
      { total: bigint }[]
    >`SELECT COUNT(*) AS total ${from} ${where}`,
  ]);
  const page = rows.slice(0, limit);
  return {
    items: page,
    total: Number(totals[0]?.total ?? 0),
    nextCursor:
      rows.length > limit ? (page[page.length - 1]?.mentionId ?? null) : null,
  };
}

/**
 * An expression Peas doesn't understand yet: an open review card for an unknown food phrase, an unknown modifier, or an ambiguous match.
 *
 * @example
 * { discoveryId: "0193...", type: "UNKNOWN_FOOD_PHRASE", phrase: "calamansi juice", mentions: 4, notes: 3 }
 */
export interface UnknownExpression {
  discoveryId: string;
  type: UnknownExpressionType;
  phrase: string;
  mentions: number;
  notes: number;
}

/**
 * Open unknown and ambiguous expressions, most notes first. With `sourceId`, only evidence from notes linked to that source counts, so a site's or a book's peculiar vocabulary stands out.
 *
 * @example
 * await listUnknownExpressions({ sourceId: bookSourceId }) // { items: [{ phrase: "calamansi juice", notes: 3, ... }], total: 12 }
 */
export async function listUnknownExpressions(
  {
    type,
    sourceId,
    offset = 0,
    limit = 50,
  }: {
    type?: UnknownExpressionType;
    sourceId?: string;
    offset?: number;
    limit?: number;
  } = {},
  db: DbClient = prisma
): Promise<{ items: UnknownExpression[]; total: number }> {
  const types = type ? [type] : [...UNKNOWN_EXPRESSION_TYPES];
  const bySource = sourceId
    ? Prisma.sql`JOIN "NoteSource" ns ON ns."noteId" = e."noteId" AND ns."sourceId" = ${sourceId}`
    : Prisma.empty;
  const grouped = Prisma.sql`
    SELECT d.id, d.type::text AS type, d.key AS phrase,
           COUNT(DISTINCT e."mentionId") AS mentions, COUNT(DISTINCT e."noteId") AS notes
    FROM "Discovery" d
    JOIN "DiscoveryEvidence" e ON e."discoveryId" = d.id
    ${bySource}
    WHERE d.status = 'OPEN' AND d.type::text IN (${Prisma.join(types)})
    GROUP BY d.id, d.type, d.key
  `;
  const [rows, totals] = await Promise.all([
    db.$queryRaw<
      {
        id: string;
        type: UnknownExpressionType;
        phrase: string;
        mentions: bigint;
        notes: bigint;
      }[]
    >`
      SELECT * FROM (${grouped}) g
      ORDER BY g.notes DESC, g.mentions DESC, g.phrase ASC
      OFFSET ${offset} LIMIT ${limit}
    `,
    db.$queryRaw<
      { total: bigint }[]
    >`SELECT COUNT(*) AS total FROM (${grouped}) g`,
  ]);
  return {
    items: rows.map((row) => ({
      discoveryId: row.id,
      type: row.type,
      phrase: row.phrase,
      mentions: Number(row.mentions),
      notes: Number(row.notes),
    })),
    total: Number(totals[0]?.total ?? 0),
  };
}

/**
 * Sources whose notes carry open unknown or ambiguous expressions, for the source filter, most notes first (at most 50).
 *
 * @example
 * await getUnknownExpressionSources() // [{ id: "cm3s...", label: "Salt, Fat, Acid, Heat", notes: 7 }]
 */
export async function getUnknownExpressionSources(
  db: DbClient = prisma
): Promise<{ id: string; label: string; notes: number }[]> {
  const rows = await db.$queryRaw<
    { id: string; label: string; notes: bigint }[]
  >`
    SELECT s.id, ${SOURCE_LABEL} AS label, COUNT(DISTINCT e."noteId") AS notes
    FROM "Discovery" d
    JOIN "DiscoveryEvidence" e ON e."discoveryId" = d.id
    JOIN "NoteSource" ns ON ns."noteId" = e."noteId"
    JOIN "Source" s ON s.id = ns."sourceId"
    LEFT JOIN "Book" b ON b.id = s."bookId"
    LEFT JOIN "URL" u ON u."sourceId" = s.id
    WHERE d.status = 'OPEN' AND d.type::text IN (${Prisma.join([...UNKNOWN_EXPRESSION_TYPES])})
    GROUP BY s.id, label
    ORDER BY notes DESC, label ASC
    LIMIT 50
  `;
  return rows.map((row) => ({ ...row, notes: Number(row.notes) }));
}

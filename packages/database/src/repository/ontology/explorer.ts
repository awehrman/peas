import { type DbClient, OntologyError } from "./helpers.js";
import { getDescendants } from "./relationships.js";

import {
  type EntryStatus,
  type FoodRelationshipType,
  type LexiconRole,
  type LexiconTermKind,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../client.js";

/** "Kinds and parts": the expansion the recipe filter and category rules use. DERIVED_FROM and PROCESSED_FROM ("made from") are opt-in. */
export const DEFAULT_USAGE_EXPANSION: readonly FoodRelationshipType[] = [
  "IS_A",
  "PART_OF",
];

const MAX_CONTRIBUTORS = 25;
const MAX_DISTRIBUTION_ROWS = 25;

/**
 * Which mentions a usage statistic counts. By default only settled mentions count: those that name the concept (AUTO_RESOLVED or VERIFIED), so an unreviewed guess never inflates usage. `includeNeedsReview` also counts NEEDS_REVIEW mentions whose best candidate is the concept. Expansion walks down the given relationship types to more specific foods.
 *
 * @example
 * { expand: ["IS_A", "PART_OF"], includeNeedsReview: false }
 */
export interface UsageOptions {
  expand?: readonly FoodRelationshipType[];
  includeNeedsReview?: boolean;
}

/** Mentions, and the distinct lines, notes, and recipes they appear in. */
export interface UsageCounts {
  mentions: number;
  lines: number;
  notes: number;
  recipes: number;
}

/**
 * A more specific concept whose mentions count toward the expanded total, with the relationship path that reached it.
 *
 * @example
 * { conceptId: "<chicken thigh>", canonicalName: "chicken thigh", path: ["PART_OF"], depth: 1, counts: { mentions: 12, lines: 12, notes: 9, recipes: 4 } }
 */
export interface UsageContributor {
  conceptId: string;
  canonicalName: string;
  path: FoodRelationshipType[];
  depth: number;
  counts: UsageCounts;
}

/**
 * How often a concept appears, directly and through more specific concepts. Every count is over active lines of notes that are not archived.
 *
 * @example
 * // chicken, default expansion
 * {
 *   direct: { mentions: 3, lines: 3, notes: 3, recipes: 1 },
 *   expanded: { mentions: 15, lines: 15, notes: 11, recipes: 5 },
 *   byStatus: { autoResolved: 3, verified: 0, needsReview: 1 },
 *   contributors: [{ canonicalName: "chicken thigh", path: ["PART_OF"], counts: { mentions: 12, ... } }],
 * }
 */
export interface ConceptUsageRecord {
  conceptId: string;
  expand: FoodRelationshipType[];
  includeNeedsReview: boolean;
  direct: UsageCounts;
  expanded: UsageCounts;
  /** Direct mentions by status; `needsReview` counts mentions waiting for review whose best candidate is the concept, whatever `includeNeedsReview` says. */
  byStatus: { autoResolved: number; verified: number; needsReview: number };
  /** More specific concepts with at least one counted mention, most mentioned first (at most 25). */
  contributors: UsageContributor[];
}

interface CountRow {
  conceptId: string | null;
  mentions: bigint;
  lines: bigint;
  notes: bigint;
  recipes: bigint;
}

function toCounts(row: CountRow | undefined): UsageCounts {
  return {
    mentions: Number(row?.mentions ?? 0),
    lines: Number(row?.lines ?? 0),
    notes: Number(row?.notes ?? 0),
    recipes: Number(row?.recipes ?? 0),
  };
}

function uuidList(ids: readonly string[]): Prisma.Sql {
  return Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));
}

const CANDIDATE_CONCEPT = Prisma.sql`(m.resolution->'candidates'->0->>'conceptId')::uuid`;

/** The concept a mention counts for: the concept it names, or (when asked) the best candidate of a mention waiting for review. */
function countedConcept(includeNeedsReview: boolean): Prisma.Sql {
  return includeNeedsReview
    ? Prisma.sql`COALESCE(m."conceptId", CASE WHEN m."resolutionStatus" = 'NEEDS_REVIEW' THEN ${CANDIDATE_CONCEPT} END)`
    : Prisma.sql`m."conceptId"`;
}

/** Written as an OR so the planner can use the concept and status indexes. */
function countsFor(
  conceptIds: readonly string[],
  includeNeedsReview: boolean
): Prisma.Sql {
  const ids = uuidList(conceptIds);
  return includeNeedsReview
    ? Prisma.sql`(m."conceptId" IN (${ids}) OR (m."resolutionStatus" = 'NEEDS_REVIEW' AND ${CANDIDATE_CONCEPT} IN (${ids})))`
    : Prisma.sql`m."conceptId" IN (${ids})`;
}

/** Joins mentions (aliased `m`, joined on `mentionId` when given) to active lines of unarchived notes, plus any extra joins, and keeps the counted ones. */
function countedMentions(
  conceptIds: readonly string[],
  includeNeedsReview: boolean,
  {
    mentionId,
    joins = Prisma.empty,
  }: { mentionId?: Prisma.Sql; joins?: Prisma.Sql } = {}
): Prisma.Sql {
  const mentions = mentionId
    ? Prisma.sql`JOIN "IngredientMention" m ON m.id = ${mentionId}`
    : Prisma.sql`FROM "IngredientMention" m`;
  return Prisma.sql`
    ${mentions}
    JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
    JOIN "Note" n ON n.id = l."noteId"
    ${joins}
    WHERE ${countsFor(conceptIds, includeNeedsReview)}
      AND l."isActive" = true
      AND n."archivedAt" IS NULL
  `;
}

async function expandedIds(
  conceptId: string,
  expand: readonly FoodRelationshipType[],
  db: DbClient
) {
  const descendants = await getDescendants(conceptId, expand, db);
  return {
    descendants,
    allIds: [conceptId, ...descendants.map((related) => related.conceptId)],
  };
}

/**
 * Direct and expanded usage of a concept. Expansion follows only the requested relationship types downward, so ground chicken (PROCESSED_FROM chicken) counts toward chicken only when PROCESSED_FROM is asked for.
 *
 * @example
 * await getConceptUsage(chickenId) // { direct: { mentions: 3, ... }, expanded: { mentions: 15, ... }, contributors: [...] }
 * await getConceptUsage(chickenId, { expand: [] }) // expanded equals direct
 */
export async function getConceptUsage(
  conceptId: string,
  {
    expand = DEFAULT_USAGE_EXPANSION,
    includeNeedsReview = false,
  }: UsageOptions = {},
  db: DbClient = prisma
): Promise<ConceptUsageRecord> {
  const { descendants, allIds } = await expandedIds(conceptId, expand, db);
  const concept = countedConcept(includeNeedsReview);
  const counted = countedMentions(allIds, includeNeedsReview);

  // Grouping by line, then note, before counting avoids COUNT(DISTINCT), whose sort spills to disk on large concepts.
  const [perConcept, totals, statusRows] = await Promise.all([
    db.$queryRaw<CountRow[]>`
      WITH per_line AS (
        SELECT (${concept})::text AS "conceptId", m."parsedLineId" AS line, n.id AS note, COUNT(*) AS mentions
        ${counted}
        GROUP BY 1, 2, 3
      ), per_note AS (
        SELECT "conceptId", note, SUM(mentions) AS mentions, COUNT(*) AS lines
        FROM per_line GROUP BY 1, 2
      )
      SELECT p."conceptId", SUM(p.mentions) AS mentions, SUM(p.lines) AS lines,
             COUNT(*) AS notes, COUNT(r.id) AS recipes
      FROM per_note p LEFT JOIN "Recipe" r ON r."noteId" = p.note
      GROUP BY p."conceptId"
    `,
    db.$queryRaw<CountRow[]>`
      WITH per_line AS (
        SELECT m."parsedLineId" AS line, n.id AS note, COUNT(*) AS mentions
        ${counted}
        GROUP BY 1, 2
      ), per_note AS (
        SELECT note, SUM(mentions) AS mentions, COUNT(*) AS lines
        FROM per_line GROUP BY 1
      )
      SELECT NULL AS "conceptId", COALESCE(SUM(p.mentions), 0) AS mentions, COALESCE(SUM(p.lines), 0) AS lines,
             COUNT(*) AS notes, COUNT(r.id) AS recipes
      FROM per_note p LEFT JOIN "Recipe" r ON r."noteId" = p.note
    `,
    db.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT m."resolutionStatus"::text AS status, COUNT(*) AS count
      ${countedMentions([conceptId], true)}
      GROUP BY m."resolutionStatus"
    `,
  ]);

  const byConcept = new Map(perConcept.map((row) => [row.conceptId, row]));
  const statusCount = (status: string) =>
    Number(statusRows.find((row) => row.status === status)?.count ?? 0);

  const contributors = descendants
    .flatMap((related): UsageContributor[] => {
      const row = byConcept.get(related.conceptId);
      return row ? [{ ...related, counts: toCounts(row) }] : [];
    })
    .sort(
      (a, b) =>
        b.counts.mentions - a.counts.mentions ||
        a.canonicalName.localeCompare(b.canonicalName)
    )
    .slice(0, MAX_CONTRIBUTORS);

  return {
    conceptId,
    expand: [...expand],
    includeNeedsReview,
    direct: toCounts(byConcept.get(conceptId)),
    expanded: toCounts(totals[0]),
    byStatus: {
      autoResolved: statusCount("AUTO_RESOLVED"),
      verified: statusCount("VERIFIED"),
      needsReview: statusCount("NEEDS_REVIEW"),
    },
    contributors,
  };
}

/**
 * One of a concept's names and how often the corpus uses it: the lexicon entry the resolver matched for each direct mention.
 *
 * @example
 * { entryId: "<'chicken thighs'>", text: "chicken thighs", kind: "PLURAL", status: "ACTIVE", mentions: 9, notes: 7, example: "1 lb boneless chicken thighs" }
 * { entryId: "<'thigh meat'>", text: "thigh meat", kind: "ALIAS", status: "ACTIVE", mentions: 0, notes: 0, example: null }
 */
export interface ObservedForm {
  entryId: string;
  text: string;
  kind: LexiconTermKind | null;
  status: EntryStatus;
  mentions: number;
  notes: number;
  example: string | null;
}

/**
 * The concept's names with how often each one is how a direct mention was written, most used first; names the corpus never uses come last with zero counts. `otherMentions` counts direct mentions that reached the concept without one of its own names (for example a person verified the mention by hand).
 *
 * @example
 * await getObservedForms(chickenThighId)
 * // { forms: [{ text: "chicken thighs", mentions: 9, ... }, { text: "chicken thigh", mentions: 3, ... }], otherMentions: 1 }
 */
export async function getObservedForms(
  conceptId: string,
  { includeNeedsReview = false }: Pick<UsageOptions, "includeNeedsReview"> = {},
  db: DbClient = prisma
): Promise<{ forms: ObservedForm[]; otherMentions: number }> {
  const [entries, rows] = await Promise.all([
    db.lexiconEntry.findMany({
      where: { conceptId, role: "FOOD", status: { not: "DEPRECATED" } },
      select: { id: true, text: true, kind: true, status: true },
      orderBy: { text: "asc" },
    }),
    db.$queryRaw<
      {
        entryId: string | null;
        mentions: bigint;
        notes: bigint;
        example: string;
      }[]
    >`
      SELECT m.resolution->'candidates'->0->>'entryId' AS "entryId",
             COUNT(*) AS mentions,
             COUNT(DISTINCT n.id) AS notes,
             (ARRAY_AGG(l.reference ORDER BY m.id DESC))[1] AS example
      ${countedMentions([conceptId], includeNeedsReview)}
      GROUP BY 1
    `,
  ]);

  const byEntry = new Map(rows.map((row) => [row.entryId, row]));
  const forms = entries
    .map((entry): ObservedForm => {
      const row = byEntry.get(entry.id);
      return {
        entryId: entry.id,
        text: entry.text,
        kind: entry.kind,
        status: entry.status,
        mentions: Number(row?.mentions ?? 0),
        notes: Number(row?.notes ?? 0),
        example: row?.example ?? null,
      };
    })
    .sort((a, b) => b.mentions - a.mentions || a.text.localeCompare(b.text));
  const ownEntryIds = new Set(entries.map((entry) => entry.id));
  const otherMentions = rows
    .filter((row) => row.entryId === null || !ownEntryIds.has(row.entryId))
    .reduce((sum, row) => sum + Number(row.mentions), 0);
  return { forms, otherMentions };
}

/**
 * How a concept is prepared: each preparation (with its degree) across mentions, counted directly and with the expansion.
 *
 * @example
 * { preparationKey: "dice", label: "dice", degreeKey: null, direct: 2, expanded: 5 }
 */
export interface PreparationUsage {
  preparationKey: string;
  label: string;
  degreeKey: string | null;
  direct: number;
  expanded: number;
}

/**
 * Attribute values on mentions. `asserted` counts the ones written in the text ("boneless"), as opposed to inferred from the concept.
 *
 * @example
 * { definitionKey: "bone", definitionName: "Bone", valueKey: "boneless", label: "boneless", direct: 0, expanded: 8, asserted: 8 }
 */
export interface AttributeUsage {
  definitionKey: string;
  definitionName: string;
  valueKey: string;
  label: string;
  direct: number;
  expanded: number;
  asserted: number;
}

/**
 * Measurement modifiers and instructions on mentions ("heaping", "divided").
 *
 * @example
 * { role: "INSTRUCTION", valueKey: "divided", direct: 1, expanded: 3 }
 */
export interface ModifierUsage {
  role: LexiconRole;
  valueKey: string;
  direct: number;
  expanded: number;
}

export interface ConceptDistributionsRecord {
  expand: FoodRelationshipType[];
  includeNeedsReview: boolean;
  preparations: PreparationUsage[];
  attributes: AttributeUsage[];
  modifiers: ModifierUsage[];
}

/**
 * Preparation, attribute, and modifier distributions over a concept's counted mentions, each row with its direct count and its count over the expanded concepts, most common first (at most 25 per list).
 *
 * @example
 * await getConceptDistributions(chickenId)
 * // { preparations: [{ preparationKey: "dice", direct: 0, expanded: 4 }], attributes: [{ valueKey: "boneless", expanded: 8, ... }], modifiers: [] }
 */
export async function getConceptDistributions(
  conceptId: string,
  {
    expand = DEFAULT_USAGE_EXPANSION,
    includeNeedsReview = false,
  }: UsageOptions = {},
  db: DbClient = prisma
): Promise<ConceptDistributionsRecord> {
  const { allIds } = await expandedIds(conceptId, expand, db);
  const isDirect = Prisma.sql`${countedConcept(includeNeedsReview)} = ${conceptId}::uuid`;
  const counted = (mentionId: Prisma.Sql) =>
    countedMentions(allIds, includeNeedsReview, { mentionId });

  const [preparations, attributes, modifiers] = await Promise.all([
    db.$queryRaw<
      {
        preparationKey: string;
        label: string;
        degreeKey: string | null;
        direct: bigint;
        expanded: bigint;
      }[]
    >`
      SELECT p.key AS "preparationKey", p.label, mp."degreeKey",
             COUNT(*) FILTER (WHERE ${isDirect}) AS direct,
             COUNT(*) AS expanded
      FROM "MentionPreparation" mp
      JOIN "PreparationOperation" p ON p.id = mp."preparationId"
      ${counted(Prisma.sql`mp."mentionId"`)}
      GROUP BY p.key, p.label, mp."degreeKey"
      ORDER BY expanded DESC, p.key ASC
      LIMIT ${MAX_DISTRIBUTION_ROWS}
    `,
    db.$queryRaw<
      {
        definitionKey: string;
        definitionName: string;
        valueKey: string;
        label: string;
        direct: bigint;
        expanded: bigint;
        asserted: bigint;
      }[]
    >`
      SELECT d.key AS "definitionKey", d.name AS "definitionName", v.key AS "valueKey", v.label,
             COUNT(*) FILTER (WHERE ${isDirect}) AS direct,
             COUNT(*) AS expanded,
             COUNT(*) FILTER (WHERE ma.source = 'ASSERTED') AS asserted
      FROM "MentionAttribute" ma
      JOIN "AttributeValue" v ON v.id = ma."attributeValueId"
      JOIN "AttributeDefinition" d ON d.id = v."definitionId"
      ${counted(Prisma.sql`ma."mentionId"`)}
      GROUP BY d.key, d.name, v.key, v.label
      ORDER BY expanded DESC, d.key ASC, v.key ASC
      LIMIT ${MAX_DISTRIBUTION_ROWS}
    `,
    db.$queryRaw<
      {
        role: LexiconRole;
        valueKey: string;
        direct: bigint;
        expanded: bigint;
      }[]
    >`
      SELECT mm.role::text AS role, mm."valueKey",
             COUNT(*) FILTER (WHERE ${isDirect}) AS direct,
             COUNT(*) AS expanded
      FROM "MentionModifier" mm
      ${counted(Prisma.sql`mm."mentionId"`)}
      GROUP BY mm.role, mm."valueKey"
      ORDER BY expanded DESC, mm."valueKey" ASC
      LIMIT ${MAX_DISTRIBUTION_ROWS}
    `,
  ]);

  return {
    expand: [...expand],
    includeNeedsReview,
    preparations: preparations.map((row) => ({
      preparationKey: row.preparationKey,
      label: row.label,
      degreeKey: row.degreeKey,
      direct: Number(row.direct),
      expanded: Number(row.expanded),
    })),
    attributes: attributes.map((row) => ({
      definitionKey: row.definitionKey,
      definitionName: row.definitionName,
      valueKey: row.valueKey,
      label: row.label,
      direct: Number(row.direct),
      expanded: Number(row.expanded),
      asserted: Number(row.asserted),
    })),
    modifiers: modifiers.map((row) => ({
      role: row.role,
      valueKey: row.valueKey,
      direct: Number(row.direct),
      expanded: Number(row.expanded),
    })),
  };
}

const SOURCE_LABEL = Prisma.sql`COALESCE(s."displayName", b.title, u."normalizedUrl", s."canonicalKey")`;
const COUNTED_CATEGORY_STATES = Prisma.sql`('APPROVED', 'INFERRED')`;

/**
 * Narrows the occurrence list. A category counts when the note's membership is approved or inferred; a source when the note links to it at all.
 *
 * @example
 * { expand: ["IS_A", "PART_OF"], preparationKey: "dice", attribute: { definitionKey: "bone", valueKey: "boneless" }, status: "AUTO_RESOLVED" }
 */
export interface OccurrenceFilter extends UsageOptions {
  preparationKey?: string;
  attribute?: { definitionKey: string; valueKey: string };
  sourceId?: string;
  categoryId?: string;
  status?: "AUTO_RESOLVED" | "VERIFIED" | "NEEDS_REVIEW";
}

/**
 * One mention behind a concept's usage, with the line it came from and how it matched.
 *
 * @example
 * {
 *   mentionId: "0193...", lineText: "4 chicken thighs, diced", span: { start: 0, end: 23, text: "4 chicken thighs, diced" },
 *   noteId: "cm3n...", noteTitle: "Braised thighs", recipeId: "cm3r...", recipeTitle: "Braised thighs",
 *   conceptId: "<chicken thigh>", conceptName: "chicken thigh", path: ["PART_OF"], resolutionStatus: "AUTO_RESOLVED",
 *   preparations: ["dice"], attributes: [],
 * }
 */
export interface ConceptOccurrence {
  mentionId: string;
  lineId: string;
  lineText: string;
  span: { start: number; end: number; text: string };
  noteId: string;
  noteTitle: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  /** The concept the mention counts for: this one, a more specific one, or a review candidate. */
  conceptId: string;
  conceptName: string;
  /** Relationship types from the explored concept down to `conceptId`; empty for a direct mention. */
  path: FoodRelationshipType[];
  resolutionStatus: "AUTO_RESOLVED" | "VERIFIED" | "NEEDS_REVIEW";
  /** Labels with degree, e.g. "chop (fine)". */
  preparations: string[];
  /** "Dimension: value", e.g. "Bone: boneless". */
  attributes: string[];
}

export interface ConceptOccurrencePage {
  items: ConceptOccurrence[];
  total: number;
  endCursor: string | null;
  hasNextPage: boolean;
}

type OccurrenceKey = [string, number, number, number, number];

function encodeCursor(key: OccurrenceKey): string {
  return Buffer.from(JSON.stringify(key)).toString("base64url");
}

function decodeCursor(cursor: string): OccurrenceKey {
  try {
    const key: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    );
    if (
      Array.isArray(key) &&
      key.length === 5 &&
      typeof key[0] === "string" &&
      key.slice(1).every((part) => Number.isInteger(part))
    )
      return key as OccurrenceKey;
  } catch {
    // fall through to the error below
  }
  throw new OntologyError("Invalid occurrence cursor");
}

function occurrenceFilters(filter: OccurrenceFilter): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (filter.preparationKey)
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "MentionPreparation" fmp
      JOIN "PreparationOperation" fp ON fp.id = fmp."preparationId"
      WHERE fmp."mentionId" = m.id AND fp.key = ${filter.preparationKey})`);
  if (filter.attribute)
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "MentionAttribute" fma
      JOIN "AttributeValue" fv ON fv.id = fma."attributeValueId"
      JOIN "AttributeDefinition" fd ON fd.id = fv."definitionId"
      WHERE fma."mentionId" = m.id AND fd.key = ${filter.attribute.definitionKey} AND fv.key = ${filter.attribute.valueKey})`);
  if (filter.sourceId)
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "NoteSource" fns WHERE fns."noteId" = n.id AND fns."sourceId" = ${filter.sourceId})`);
  if (filter.categoryId)
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "NoteCategory" fnc
      WHERE fnc."noteId" = n.id AND fnc."categoryId" = ${filter.categoryId}
        AND fnc.state::text IN ${COUNTED_CATEGORY_STATES})`);
  if (filter.status)
    conditions.push(Prisma.sql`m."resolutionStatus"::text = ${filter.status}`);
  return conditions.length === 0
    ? Prisma.empty
    : Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`;
}

/**
 * Every counted mention of a concept (and, with the expansion, of its more specific concepts), in reading order: by note, then block, line, segment, and part. Pages are keyset-based (`after` is the previous page's `endCursor`), so they stay stable while notes are imported.
 *
 * @example
 * const first = await listConceptOccurrences(chickenId, { preparationKey: "dice" }, { limit: 50 });
 * const next = await listConceptOccurrences(chickenId, { preparationKey: "dice" }, { after: first.endCursor, limit: 50 });
 */
export async function listConceptOccurrences(
  conceptId: string,
  filter: OccurrenceFilter = {},
  { after, limit = 50 }: { after?: string | null; limit?: number } = {},
  db: DbClient = prisma
): Promise<ConceptOccurrencePage> {
  const { expand = DEFAULT_USAGE_EXPANSION, includeNeedsReview = false } =
    filter;
  const { descendants, allIds } = await expandedIds(conceptId, expand, db);
  const concept = countedConcept(includeNeedsReview);
  const base = countedMentions(allIds, includeNeedsReview, {
    joins: Prisma.sql`LEFT JOIN "Recipe" r ON r."noteId" = n.id`,
  });
  const filters = occurrenceFilters(filter);
  const key = after ? decodeCursor(after) : null;
  const afterKey = key
    ? Prisma.sql`AND (l."noteId", l."blockIndex", l."lineIndex", m."segmentIndex", m."partIndex") > (${key[0]}, ${key[1]}, ${key[2]}, ${key[3]}, ${key[4]})`
    : Prisma.empty;

  const [rows, totals, root] = await Promise.all([
    db.$queryRaw<
      {
        mentionId: string;
        lineId: string;
        lineText: string;
        spanStart: number;
        spanEnd: number;
        noteId: string;
        noteTitle: string | null;
        recipeId: string | null;
        recipeTitle: string | null;
        conceptId: string;
        status: ConceptOccurrence["resolutionStatus"];
        blockIndex: number;
        lineIndex: number;
        segmentIndex: number;
        partIndex: number;
        preparations: string[];
        attributes: string[];
      }[]
    >`
      SELECT m.id::text AS "mentionId", l.id AS "lineId", l.reference AS "lineText",
             m."spanStart", m."spanEnd", n.id AS "noteId", n.title AS "noteTitle",
             r.id AS "recipeId", r.title AS "recipeTitle",
             (${concept})::text AS "conceptId", m."resolutionStatus"::text AS status,
             l."blockIndex", l."lineIndex", m."segmentIndex", m."partIndex",
             COALESCE((
               SELECT ARRAY_AGG(p.label || COALESCE(' (' || mp."degreeKey" || ')', '') ORDER BY mp."order")
               FROM "MentionPreparation" mp JOIN "PreparationOperation" p ON p.id = mp."preparationId"
               WHERE mp."mentionId" = m.id
             ), ARRAY[]::text[]) AS preparations,
             COALESCE((
               SELECT ARRAY_AGG(d.name || ': ' || v.label ORDER BY d.key, v.key)
               FROM "MentionAttribute" ma
               JOIN "AttributeValue" v ON v.id = ma."attributeValueId"
               JOIN "AttributeDefinition" d ON d.id = v."definitionId"
               WHERE ma."mentionId" = m.id
             ), ARRAY[]::text[]) AS attributes
      ${base} ${filters} ${afterKey}
      ORDER BY l."noteId", l."blockIndex", l."lineIndex", m."segmentIndex", m."partIndex"
      LIMIT ${limit + 1}
    `,
    db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total ${base} ${filters}
    `,
    db.foodConcept.findUnique({
      where: { id: conceptId },
      select: { canonicalName: true },
    }),
  ]);

  const related = new Map(
    descendants.map((row) => [row.conceptId, row] as const)
  );
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((row) => {
      const descendant = related.get(row.conceptId);
      return {
        mentionId: row.mentionId,
        lineId: row.lineId,
        lineText: row.lineText,
        span: {
          start: row.spanStart,
          end: row.spanEnd,
          text: row.lineText.slice(row.spanStart, row.spanEnd),
        },
        noteId: row.noteId,
        noteTitle: row.noteTitle,
        recipeId: row.recipeId,
        recipeTitle: row.recipeTitle,
        conceptId: row.conceptId,
        conceptName: descendant?.canonicalName ?? root?.canonicalName ?? "",
        path: descendant?.path ?? [],
        resolutionStatus: row.status,
        preparations: row.preparations,
        attributes: row.attributes,
      };
    }),
    total: Number(totals[0]?.total ?? 0),
    endCursor: last
      ? encodeCursor([
          last.noteId,
          last.blockIndex,
          last.lineIndex,
          last.segmentIndex,
          last.partIndex,
        ])
      : null,
    hasNextPage: rows.length > limit,
  };
}

/**
 * The sources and categories of the notes behind a concept's counted mentions, for the occurrence filters, most notes first (at most 25 each).
 *
 * @example
 * await getConceptOccurrenceFacets(chickenId)
 * // { sources: [{ id: "cm3s...", label: "Salt, Fat, Acid, Heat", notes: 4 }], categories: [{ id: "cm3c...", name: "Dinner", notes: 7 }] }
 */
export async function getConceptOccurrenceFacets(
  conceptId: string,
  {
    expand = DEFAULT_USAGE_EXPANSION,
    includeNeedsReview = false,
  }: UsageOptions = {},
  db: DbClient = prisma
): Promise<{
  sources: { id: string; label: string; notes: number }[];
  categories: { id: string; name: string; notes: number }[];
}> {
  const { allIds } = await expandedIds(conceptId, expand, db);
  const notes = Prisma.sql`
    SELECT DISTINCT n.id ${countedMentions(allIds, includeNeedsReview)}
  `;
  const [sources, categories] = await Promise.all([
    db.$queryRaw<{ id: string; label: string; notes: bigint }[]>`
      SELECT s.id, ${SOURCE_LABEL} AS label, COUNT(DISTINCT ns."noteId") AS notes
      FROM "NoteSource" ns
      JOIN "Source" s ON s.id = ns."sourceId"
      LEFT JOIN "Book" b ON b.id = s."bookId"
      LEFT JOIN "URL" u ON u."sourceId" = s.id
      WHERE ns."noteId" IN (${notes})
      GROUP BY s.id, label
      ORDER BY notes DESC, label ASC
      LIMIT ${MAX_DISTRIBUTION_ROWS}
    `,
    db.$queryRaw<{ id: string; name: string; notes: bigint }[]>`
      SELECT c.id, c.name, COUNT(DISTINCT nc."noteId") AS notes
      FROM "NoteCategory" nc
      JOIN "Category" c ON c.id = nc."categoryId"
      WHERE nc."noteId" IN (${notes}) AND nc.state::text IN ${COUNTED_CATEGORY_STATES}
      GROUP BY c.id, c.name
      ORDER BY notes DESC, c.name ASC
      LIMIT ${MAX_DISTRIBUTION_ROWS}
    `,
  ]);
  return {
    sources: sources.map((row) => ({ ...row, notes: Number(row.notes) })),
    categories: categories.map((row) => ({ ...row, notes: Number(row.notes) })),
  };
}

/**
 * A food's place in the corpus: settled mentions of it directly (and the notes they are in), and mentions including its kinds and parts (IS_A and PART_OF descendants).
 *
 * @example
 * { conceptId: "<chicken>", canonicalName: "chicken", status: "VERIFIED", directMentions: 3, directNotes: 3, expandedMentions: 15 }
 */
export interface ConceptUsageRank {
  conceptId: string;
  canonicalName: string;
  status: "PROPOSED" | "VERIFIED" | "DEPRECATED";
  directMentions: number;
  directNotes: number;
  expandedMentions: number;
}

/**
 * Corpus-wide usage (Phase 8-D). Every count is over settled mentions (AUTO_RESOLVED or VERIFIED) on active lines of unarchived notes; "expanded" adds mentions of kinds and parts, so the two never mix.
 *
 * @example
 * {
 *   settledMentions: 812, conceptsWithMentions: 140, unusedVerifiedConcepts: 6, rareConceptCount: 41,
 *   topDirect: [{ canonicalName: "salt", directMentions: 90, ... }], topExpanded: [{ canonicalName: "chicken", expandedMentions: 48, ... }],
 *   rare: [{ canonicalName: "calamansi", directNotes: 1, ... }],
 *   preparations: [{ preparationKey: "chop", label: "Chop", mentions: 64, concepts: 21 }],
 *   attributes: [{ definitionName: "Bone", label: "Boneless", mentions: 12, asserted: 12 }],
 * }
 */
export interface CorpusAnalyticsRecord {
  settledMentions: number;
  conceptsWithMentions: number;
  unusedVerifiedConcepts: number;
  rareConceptCount: number;
  topDirect: ConceptUsageRank[];
  topExpanded: ConceptUsageRank[];
  rare: ConceptUsageRank[];
  preparations: {
    preparationKey: string;
    label: string;
    mentions: number;
    concepts: number;
  }[];
  attributes: {
    definitionKey: string;
    definitionName: string;
    valueKey: string;
    label: string;
    mentions: number;
    asserted: number;
  }[];
}

/** Settled mentions on active lines of unarchived notes. */
const SETTLED_MENTIONS = Prisma.sql`
  FROM "IngredientMention" m
  JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
  JOIN "Note" n ON n.id = l."noteId"
  WHERE m."conceptId" IS NOT NULL AND l."isActive" = true AND n."archivedAt" IS NULL
`;

/** A food mentioned in at most this many notes counts as rare. */
export const RARE_NOTE_LIMIT = 2;

/**
 * Corpus analytics computed on request: mentions are grouped by concept first, then rolled up through the IS_A / PART_OF closure, so the cost grows with the number of concepts rather than mentions times hierarchy.
 *
 * @example
 * await getCorpusAnalytics({ limit: 10 })
 */
export async function getCorpusAnalytics(
  { limit = 10, rareLimit = 20 }: { limit?: number; rareLimit?: number } = {},
  db: DbClient = prisma
): Promise<CorpusAnalyticsRecord> {
  const [ranks, preparations, attributes] = await Promise.all([
    db.$queryRaw<
      {
        conceptId: string;
        canonicalName: string;
        status: ConceptUsageRank["status"];
        directMentions: bigint;
        directNotes: bigint;
        expandedMentions: bigint;
      }[]
    >`
      WITH RECURSIVE closure(ancestor, descendant) AS (
        SELECT r."targetId", r."sourceId"
        FROM "FoodRelationship" r
        WHERE r.type::text IN ('IS_A', 'PART_OF') AND r.status <> 'DEPRECATED'
        UNION
        SELECT c.ancestor, r."sourceId"
        FROM closure c
        JOIN "FoodRelationship" r ON r."targetId" = c.descendant
        WHERE r.type::text IN ('IS_A', 'PART_OF') AND r.status <> 'DEPRECATED'
      ),
      per_note AS (
        SELECT m."conceptId" AS id, n.id AS note, COUNT(*) AS mentions
        ${SETTLED_MENTIONS}
        GROUP BY 1, 2
      ),
      direct AS (
        SELECT id, SUM(mentions) AS mentions, COUNT(*) AS notes FROM per_note GROUP BY id
      ),
      rolled AS (
        SELECT cl.ancestor AS id, SUM(d.mentions) AS mentions
        FROM (SELECT DISTINCT ancestor, descendant FROM closure WHERE ancestor <> descendant) cl
        JOIN direct d ON d.id = cl.descendant
        GROUP BY cl.ancestor
      )
      SELECT c.id::text AS "conceptId", c."canonicalName", c.status::text AS status,
             COALESCE(d.mentions, 0) AS "directMentions",
             COALESCE(d.notes, 0) AS "directNotes",
             COALESCE(d.mentions, 0) + COALESCE(r.mentions, 0) AS "expandedMentions"
      FROM "FoodConcept" c
      LEFT JOIN direct d ON d.id = c.id
      LEFT JOIN rolled r ON r.id = c.id
      WHERE c.status <> 'DEPRECATED'
    `,
    db.$queryRaw<
      {
        preparationKey: string;
        label: string;
        mentions: bigint;
        concepts: bigint;
      }[]
    >`
      SELECT p.key AS "preparationKey", p.label,
             COUNT(*) AS mentions, COUNT(DISTINCT m."conceptId") AS concepts
      FROM "MentionPreparation" mp
      JOIN "PreparationOperation" p ON p.id = mp."preparationId"
      JOIN "IngredientMention" m ON m.id = mp."mentionId"
      JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
      JOIN "Note" n ON n.id = l."noteId"
      WHERE m."conceptId" IS NOT NULL AND l."isActive" = true AND n."archivedAt" IS NULL
      GROUP BY p.key, p.label
      ORDER BY mentions DESC, p.key ASC
      LIMIT ${MAX_DISTRIBUTION_ROWS}
    `,
    db.$queryRaw<
      {
        definitionKey: string;
        definitionName: string;
        valueKey: string;
        label: string;
        mentions: bigint;
        asserted: bigint;
      }[]
    >`
      SELECT d.key AS "definitionKey", d.name AS "definitionName", v.key AS "valueKey", v.label,
             COUNT(*) AS mentions, COUNT(*) FILTER (WHERE ma.source = 'ASSERTED') AS asserted
      FROM "MentionAttribute" ma
      JOIN "AttributeValue" v ON v.id = ma."attributeValueId"
      JOIN "AttributeDefinition" d ON d.id = v."definitionId"
      JOIN "IngredientMention" m ON m.id = ma."mentionId"
      JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
      JOIN "Note" n ON n.id = l."noteId"
      WHERE m."conceptId" IS NOT NULL AND l."isActive" = true AND n."archivedAt" IS NULL
      GROUP BY d.key, d.name, v.key, v.label
      ORDER BY mentions DESC, d.key ASC, v.key ASC
      LIMIT ${MAX_DISTRIBUTION_ROWS}
    `,
  ]);

  const all: ConceptUsageRank[] = ranks.map((row) => ({
    conceptId: row.conceptId,
    canonicalName: row.canonicalName,
    status: row.status,
    directMentions: Number(row.directMentions),
    directNotes: Number(row.directNotes),
    expandedMentions: Number(row.expandedMentions),
  }));
  const byName = (a: ConceptUsageRank, b: ConceptUsageRank) =>
    a.canonicalName.localeCompare(b.canonicalName);
  const used = all.filter((rank) => rank.directMentions > 0);
  const rare = used
    .filter((rank) => rank.directNotes <= RARE_NOTE_LIMIT)
    .sort((a, b) => a.directNotes - b.directNotes || byName(a, b));

  return {
    settledMentions: used.reduce((sum, rank) => sum + rank.directMentions, 0),
    conceptsWithMentions: used.length,
    unusedVerifiedConcepts: all.filter(
      (rank) => rank.status === "VERIFIED" && rank.expandedMentions === 0
    ).length,
    rareConceptCount: rare.length,
    topDirect: [...used]
      .sort((a, b) => b.directMentions - a.directMentions || byName(a, b))
      .slice(0, limit),
    topExpanded: all
      .filter((rank) => rank.expandedMentions > 0)
      .sort((a, b) => b.expandedMentions - a.expandedMentions || byName(a, b))
      .slice(0, limit),
    rare: rare.slice(0, rareLimit),
    preparations: preparations.map((row) => ({
      preparationKey: row.preparationKey,
      label: row.label,
      mentions: Number(row.mentions),
      concepts: Number(row.concepts),
    })),
    attributes: attributes.map((row) => ({
      definitionKey: row.definitionKey,
      definitionName: row.definitionName,
      valueKey: row.valueKey,
      label: row.label,
      mentions: Number(row.mentions),
      asserted: Number(row.asserted),
    })),
  };
}

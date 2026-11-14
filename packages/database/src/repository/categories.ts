import { FOOD_RELATIONSHIP_TYPES } from "@peas/parser/v2";
import {
  type CategoryAssignmentOrigin,
  type CategoryAssignmentState,
  type CategoryKind,
  type ConceptStatus,
  type FoodRelationshipType,
  Prisma,
} from "@prisma/client";

import { prisma } from "../client.js";
import {
  type CategoryEvidence,
  CategoryEvidenceSchema,
} from "../import-integrity/schemas.js";
import {
  OntologyError,
  isUniqueViolation,
  nextFreeSlug,
  parseOrThrow,
  slugify,
  toJson,
  uuidv7,
} from "./ontology/helpers.js";
import { getCurrentRevision } from "./ontology/revision.js";

type Tx = Prisma.TransactionClient;

/** Default traversal for a food category: kinds of the food and its parts ("chicken thigh" is in Chicken), not things made from it. */
export const DEFAULT_CATEGORY_TRAVERSAL: readonly FoodRelationshipType[] = ["IS_A", "PART_OF"];

/** Mentions whose food was settled: automatically, or by a reviewer. NEEDS_REVIEW readings do not place a recipe in a category. */
const COUNTED_RESOLUTIONS = ["AUTO_RESOLVED", "VERIFIED"] as const;

const MAX_EVIDENCE_PER_NOTE = 10;
const MAX_WALK_DEPTH = 25;
const MAX_MERGE_HOPS = 10;

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  kind: CategoryKind;
  description: string | null;
  concept: { id: string; canonicalName: string; status: ConceptStatus } | null;
  traversal: FoodRelationshipType[];
  ruleVersion: number;
  approvedCount: number;
  inferredCount: number;
  excludedCount: number;
}

/** One note's membership in a category. */
export interface NoteCategoryRecord {
  /** The NoteCategory id. */
  id: string;
  state: CategoryAssignmentState;
  origin: CategoryAssignmentOrigin;
  evidence: CategoryEvidence;
  decidedAt: string | null;
  category: { id: string; name: string; slug: string; kind: CategoryKind };
}

// ============================================================================
// CATEGORIES
// ============================================================================

async function categoryCounts(categoryIds: string[]) {
  const rows = categoryIds.length
    ? await prisma.noteCategory.groupBy({
        by: ["categoryId", "state"],
        where: { categoryId: { in: categoryIds }, note: { archivedAt: null } },
        _count: { _all: true },
      })
    : [];
  const counts = new Map<string, Record<CategoryAssignmentState, number>>();
  for (const row of rows) {
    const entry = counts.get(row.categoryId) ?? { APPROVED: 0, INFERRED: 0, EXCLUDED: 0 };
    entry[row.state] = row._count._all;
    counts.set(row.categoryId, entry);
  }
  return counts;
}

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  kind: true,
  description: true,
  traversal: true,
  ruleVersion: true,
  concept: { select: { id: true, canonicalName: true, status: true } },
} as const;

type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof CATEGORY_SELECT }>;

function toCategoryRecord(
  row: CategoryRow,
  counts: Map<string, Record<CategoryAssignmentState, number>>
): CategoryRecord {
  const count = counts.get(row.id);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? slugify(row.name),
    kind: row.kind,
    description: row.description,
    concept: row.concept,
    traversal: row.traversal,
    ruleVersion: row.ruleVersion,
    approvedCount: count?.APPROVED ?? 0,
    inferredCount: count?.INFERRED ?? 0,
    excludedCount: count?.EXCLUDED ?? 0,
  };
}

/**
 * Every category, alphabetical, with membership counts by state (archived notes excluded).
 *
 * @example
 * await listCategories() // [{ name: "Chicken", kind: "CONCEPT", inferredCount: 41, ... }]
 */
export async function listCategories(): Promise<CategoryRecord[]> {
  const rows = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: CATEGORY_SELECT,
  });
  const counts = await categoryCounts(rows.map((row) => row.id));
  return rows.map((row) => toCategoryRecord(row, counts));
}

export async function getCategory(id: string): Promise<CategoryRecord | null> {
  const row = await prisma.category.findUnique({ where: { id }, select: CATEGORY_SELECT });
  if (!row) return null;
  return toCategoryRecord(row, await categoryCounts([row.id]));
}

async function freeSlug(tx: Tx, name: string): Promise<string> {
  const base = slugify(name);
  const taken = await tx.category.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  return nextFreeSlug(
    base,
    taken.map((row) => row.slug).filter((slug): slug is string => slug !== null)
  );
}

function validateTraversal(traversal: readonly FoodRelationshipType[]): FoodRelationshipType[] {
  const unique = [...new Set(traversal)];
  if (unique.some((type) => !FOOD_RELATIONSHIP_TYPES.includes(type))) {
    throw new OntologyError("Unknown relationship type in traversal");
  }
  return unique;
}

/**
 * Finds a category by name (case-insensitive, through its slug) or creates a MANUAL one.
 *
 * @example
 * await findOrCreateCategoryByName(tx, "Weeknight dinners") // { id: "cm3c..." }
 */
export async function findOrCreateCategoryByName(
  tx: Tx,
  name: string
): Promise<{ id: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new OntologyError("Category name is required");
  const existing =
    (await tx.category.findUnique({ where: { slug: slugify(trimmed) }, select: { id: true } })) ??
    (await tx.category.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
      select: { id: true },
    }));
  if (existing) return existing;
  return tx.category.create({
    data: { name: trimmed, slug: await freeSlug(tx, trimmed), kind: "MANUAL" },
    select: { id: true },
  });
}

export interface CategoryInput {
  name: string;
  description?: string | null;
  conceptId?: string | null;
  traversal?: FoodRelationshipType[];
}

/**
 * Creates a category. With a conceptId it is a CONCEPT category whose members are inferred from ingredients; without one it is MANUAL.
 *
 * @example
 * await createCategory({ name: "Chicken", conceptId: chickenId }) // traversal IS_A + PART_OF
 */
export async function createCategory(input: CategoryInput): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new OntologyError("Category name is required");
  try {
    return await prisma.$transaction(async (tx) => {
      const duplicate = await tx.category.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      });
      if (duplicate) throw new OntologyError(`A category named "${name}" already exists`);
      return tx.category.create({
        data: {
          name,
          slug: await freeSlug(tx, name),
          description: input.description ?? null,
          kind: input.conceptId ? "CONCEPT" : "MANUAL",
          conceptId: input.conceptId ?? null,
          traversal: validateTraversal(input.traversal ?? DEFAULT_CATEGORY_TRAVERSAL),
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new OntologyError(`A category named "${name}" already exists`);
    throw error;
  }
}

/**
 * Edits a category. Changing its food or traversal bumps ruleVersion; the caller then recomputes the category (`recomputeCategory`). Reviewer decisions on its members are kept.
 *
 * @example
 * await updateCategoryRule(id, { name: "Chicken", conceptId, traversal: ["IS_A", "PART_OF", "DERIVED_FROM"] }) // { ruleChanged: true }
 */
export async function updateCategoryRule(
  id: string,
  input: CategoryInput
): Promise<{ ruleChanged: boolean }> {
  const name = input.name.trim();
  if (!name) throw new OntologyError("Category name is required");
  return prisma.$transaction(async (tx) => {
    const current = await tx.category.findUnique({
      where: { id },
      select: { conceptId: true, traversal: true, ruleVersion: true, name: true },
    });
    if (!current) throw new OntologyError("Category not found");

    const conceptId = input.conceptId === undefined ? current.conceptId : input.conceptId;
    const traversal = validateTraversal(input.traversal ?? current.traversal);
    const ruleChanged =
      conceptId !== current.conceptId ||
      traversal.length !== current.traversal.length ||
      traversal.some((type) => !current.traversal.includes(type));

    await tx.category.update({
      where: { id },
      data: {
        name,
        ...(name.toLowerCase() !== current.name.toLowerCase()
          ? { slug: await freeSlug(tx, name) }
          : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        conceptId,
        kind: conceptId ? "CONCEPT" : "MANUAL",
        traversal,
        ...(ruleChanged ? { ruleVersion: current.ruleVersion + 1 } : {}),
      },
    });
    return { ruleChanged };
  });
}

// ============================================================================
// MEMBERSHIPS
// ============================================================================

/**
 * A note's category memberships in every state, alphabetical. Visible categories are INFERRED and APPROVED; EXCLUDED rows are reviewer decisions shown so they can be restored.
 *
 * @example
 * await getNoteCategoryMemberships(noteId) // [{ category: { name: "Chicken" }, state: "INFERRED", evidence: [{ conceptName: "chicken thigh", path: [{ type: "PART_OF", conceptName: "chicken" }] }] }]
 */
export async function getNoteCategoryMemberships(noteId: string): Promise<NoteCategoryRecord[]> {
  const rows = await prisma.noteCategory.findMany({
    where: { noteId },
    include: { category: { select: { name: true, slug: true, kind: true } } },
    orderBy: { category: { name: "asc" } },
  });
  return rows.map((row) => ({
    id: row.id,
    category: {
      id: row.categoryId,
      name: row.category.name,
      slug: row.category.slug ?? slugify(row.category.name),
      kind: row.category.kind,
    },
    state: row.state,
    origin: row.origin,
    evidence: row.evidence
      ? parseOrThrow(CategoryEvidenceSchema, row.evidence, "NoteCategory.evidence")
      : [],
    decidedAt: row.decidedAt?.toISOString() ?? null,
  }));
}

/**
 * Records a category that came with the import (Evernote notebook mapping). Never overrides a reviewer's decision.
 *
 * @example
 * await saveImportedCategory(noteId, "Main") // { id: "cm3c...", name: "Main" }
 */
export async function saveImportedCategory(
  noteId: string,
  categoryName: string
): Promise<{ id: string; name: string }> {
  return prisma.$transaction(async (tx) => {
    const category = await findOrCreateCategoryByName(tx, categoryName);
    const existing = await tx.noteCategory.findUnique({
      where: { noteId_categoryId: { noteId, categoryId: category.id } },
      select: { state: true },
    });
    if (!existing) {
      await tx.noteCategory.create({
        data: { noteId, categoryId: category.id, state: "APPROVED", origin: "IMPORT" },
      });
    } else if (existing.state === "INFERRED") {
      await tx.noteCategory.update({
        where: { noteId_categoryId: { noteId, categoryId: category.id } },
        data: { state: "APPROVED" },
      });
    }
    const row = await tx.category.findUniqueOrThrow({
      where: { id: category.id },
      select: { id: true, name: true },
    });
    return row;
  });
}

interface DecisionInput {
  noteId: string;
  categoryId: string;
  userId: string | null;
}

async function decide(
  tx: Tx,
  { noteId, categoryId, userId }: DecisionInput,
  state: CategoryAssignmentState,
  originIfNew: CategoryAssignmentOrigin
): Promise<void> {
  const decision = { state, decidedAt: new Date(), decidedById: userId };
  await tx.noteCategory.upsert({
    where: { noteId_categoryId: { noteId, categoryId } },
    update: decision,
    create: { noteId, categoryId, origin: originIfNew, ...decision },
  });
}

async function requireNoteAndCategory(tx: Tx, noteId: string, categoryId: string) {
  const [note, category] = await Promise.all([
    tx.note.findUnique({ where: { id: noteId }, select: { id: true } }),
    tx.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
  ]);
  if (!note) throw new OntologyError("Note not found");
  if (!category) throw new OntologyError("Category not found");
}

/**
 * Adds a note to a category by hand (by id, or by name, creating a MANUAL category). An existing inferred or excluded membership becomes APPROVED.
 *
 * @example
 * await addCategoryToNote({ noteId, categoryName: "Thanksgiving", userId })
 */
export async function addCategoryToNote({
  noteId,
  categoryId,
  categoryName,
  userId,
}: {
  noteId: string;
  categoryId?: string;
  categoryName?: string;
  userId: string | null;
}): Promise<{ categoryId: string }> {
  return prisma.$transaction(async (tx) => {
    const id = categoryId ?? (await findOrCreateCategoryByName(tx, categoryName ?? "")).id;
    await requireNoteAndCategory(tx, noteId, id);
    await decide(tx, { noteId, categoryId: id, userId }, "APPROVED", "MANUAL");
    return { categoryId: id };
  });
}

/** Accepts an inferred membership; it then survives losing its evidence. */
export async function approveCategory(input: DecisionInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await requireNoteAndCategory(tx, input.noteId, input.categoryId);
    await decide(tx, input, "APPROVED", "MANUAL");
  });
}

/** Rejects a membership. Recomputation never brings an EXCLUDED row back. */
export async function excludeCategory(input: DecisionInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await requireNoteAndCategory(tx, input.noteId, input.categoryId);
    await decide(tx, input, "EXCLUDED", "MANUAL");
  });
}

/**
 * Undoes an exclusion: the membership is derived again, becoming INFERRED when the category's rule still matches the note and disappearing otherwise.
 *
 * @example
 * await restoreCategory({ noteId, categoryId, userId }) // { state: "INFERRED" }
 */
export async function restoreCategory(
  input: DecisionInput
): Promise<{ state: CategoryAssignmentState | null }> {
  return prisma.$transaction(async (tx) => {
    const evidence = await evidenceFor(tx, input.categoryId, input.noteId);
    const noteEvidence = evidence.get(input.noteId);
    const where = { noteId_categoryId: { noteId: input.noteId, categoryId: input.categoryId } };
    if (!noteEvidence) {
      await tx.noteCategory.deleteMany({ where: { noteId: input.noteId, categoryId: input.categoryId } });
      return { state: null };
    }
    const category = await tx.category.findUniqueOrThrow({
      where: { id: input.categoryId },
      select: { ruleVersion: true },
    });
    const data = {
      state: "INFERRED" as const,
      origin: "CONCEPT_RULE" as const,
      evidence: toJson(noteEvidence),
      ruleVersion: category.ruleVersion,
      lexiconRevision: await getCurrentRevision(tx),
      decidedAt: new Date(),
      decidedById: input.userId,
    };
    await tx.noteCategory.upsert({
      where,
      update: data,
      create: { noteId: input.noteId, categoryId: input.categoryId, ...data },
    });
    return { state: "INFERRED" };
  });
}

/**
 * Removes a category from a note. When the category's rule would infer it again, the removal is recorded as an exclusion so reprocessing respects it.
 *
 * @example
 * await removeCategory({ noteId, categoryId, userId }) // { state: "EXCLUDED" } for a Chicken recipe removed from Chicken
 */
export async function removeCategory(
  input: DecisionInput
): Promise<{ state: CategoryAssignmentState | null }> {
  return prisma.$transaction(async (tx) => {
    const evidence = await evidenceFor(tx, input.categoryId, input.noteId);
    if (evidence.has(input.noteId)) {
      await decide(tx, input, "EXCLUDED", "MANUAL");
      return { state: "EXCLUDED" };
    }
    await tx.noteCategory.deleteMany({ where: { noteId: input.noteId, categoryId: input.categoryId } });
    return { state: null };
  });
}

/**
 * Sets a note's manual categories to exactly these names (the recipe edit dialog): missing names are added as APPROVED, and visible categories left out are removed or excluded as in `removeCategory`.
 *
 * @example
 * await setNoteManualCategories(noteId, ["Dinner", "Freezer friendly"], userId)
 */
export async function setNoteManualCategories(
  tx: Tx,
  noteId: string,
  names: string[],
  userId: string | null
): Promise<void> {
  const wanted = new Map<string, string>();
  for (const name of names.map((value) => value.trim()).filter(Boolean)) {
    const category = await findOrCreateCategoryByName(tx, name);
    wanted.set(category.id, name);
  }
  const visible = await tx.noteCategory.findMany({
    where: { noteId, state: { in: ["APPROVED", "INFERRED"] } },
    select: { categoryId: true, state: true },
  });
  for (const categoryId of wanted.keys()) {
    const current = visible.find((row) => row.categoryId === categoryId);
    if (current?.state === "APPROVED") continue;
    await decide(tx, { noteId, categoryId, userId }, "APPROVED", "MANUAL");
  }
  for (const row of visible) {
    if (wanted.has(row.categoryId)) continue;
    const evidence = await evidenceFor(tx, row.categoryId, noteId);
    if (evidence.has(noteId)) {
      await decide(tx, { noteId, categoryId: row.categoryId, userId }, "EXCLUDED", "MANUAL");
    } else {
      await tx.noteCategory.deleteMany({ where: { noteId, categoryId: row.categoryId } });
    }
  }
}

// ============================================================================
// DERIVATION
// ============================================================================

interface CategoryRule {
  id: string;
  targetId: string;
  traversal: FoodRelationshipType[];
  ruleVersion: number;
}

/** The category's food, following merges to the surviving concept. Null for MANUAL categories or a missing food. */
async function loadRule(tx: Tx, categoryId: string): Promise<CategoryRule | null> {
  const category = await tx.category.findUnique({
    where: { id: categoryId },
    select: { id: true, kind: true, conceptId: true, traversal: true, ruleVersion: true },
  });
  if (!category || category.kind !== "CONCEPT" || !category.conceptId) return null;
  let targetId: string = category.conceptId;
  for (let hop = 0; hop < MAX_MERGE_HOPS; hop++) {
    const concept = await tx.foodConcept.findUnique({
      where: { id: targetId },
      select: { mergedIntoId: true },
    });
    if (!concept) return null;
    if (!concept.mergedIntoId) break;
    targetId = concept.mergedIntoId;
  }
  return {
    id: category.id,
    targetId,
    traversal: category.traversal.length ? category.traversal : [...DEFAULT_CATEGORY_TRAVERSAL],
    ruleVersion: category.ruleVersion,
  };
}

interface EvidenceRow {
  noteId: string;
  lineId: string;
  mentionId: string;
  conceptId: string;
  pathTypes: string[];
  pathIds: string[];
}

/**
 * Evidence per note for one category: active lines of unarchived notes whose settled mentions name the category's food or a descendant through the allowed relationship types, with the path from each mentioned food up to the target. One set-based query; with `noteId`, only that note.
 */
async function evidenceFor(
  tx: Tx,
  categoryId: string,
  noteId?: string
): Promise<Map<string, CategoryEvidence>> {
  const rule = await loadRule(tx, categoryId);
  if (!rule) return new Map();
  return evidenceForRule(tx, rule, noteId);
}

async function evidenceForRule(
  tx: Tx,
  rule: Pick<CategoryRule, "targetId" | "traversal">,
  noteId?: string
): Promise<Map<string, CategoryEvidence>> {
  const result = new Map<string, CategoryEvidence>();

  const rows = await tx.$queryRaw<EvidenceRow[]>`
    WITH RECURSIVE walk(id, path_types, path_ids, depth) AS (
      SELECT ${rule.targetId}::uuid, ARRAY[]::text[], ARRAY[]::uuid[], 0
      UNION ALL
      SELECT r."sourceId", ARRAY[r.type::text] || w.path_types, ARRAY[w.id] || w.path_ids, w.depth + 1
      FROM "FoodRelationship" r
      JOIN walk w ON r."targetId" = w.id
      WHERE r.type::text IN (${Prisma.join(rule.traversal)})
        AND r.status <> 'DEPRECATED'
        AND w.depth < ${MAX_WALK_DEPTH}
    ),
    nearest AS (
      SELECT DISTINCT ON (id) id, path_types, path_ids FROM walk ORDER BY id, depth
    )
    SELECT line."noteId" AS "noteId", line.id AS "lineId", mention.id::text AS "mentionId",
           mention."conceptId"::text AS "conceptId", nearest.path_types AS "pathTypes",
           nearest.path_ids::text[] AS "pathIds"
    FROM nearest
    JOIN "IngredientMention" mention ON mention."conceptId" = nearest.id
    JOIN "ParsedIngredientLine" line ON line.id = mention."parsedLineId"
    JOIN "Note" note ON note.id = line."noteId"
    WHERE line."isActive"
      AND note."archivedAt" IS NULL
      AND mention."resolutionStatus"::text IN (${Prisma.join([...COUNTED_RESOLUTIONS])})
      ${noteId ? Prisma.sql`AND line."noteId" = ${noteId}` : Prisma.empty}
    ORDER BY line."noteId", line."blockIndex", line."lineIndex", mention."segmentIndex", mention."partIndex"
  `;
  if (rows.length === 0) return result;

  const conceptIds = new Set<string>();
  for (const row of rows) {
    conceptIds.add(row.conceptId);
    for (const id of row.pathIds) conceptIds.add(id);
  }
  const concepts = await tx.foodConcept.findMany({
    where: { id: { in: [...conceptIds] } },
    select: { id: true, canonicalName: true },
  });
  const names = new Map(concepts.map((concept) => [concept.id, concept.canonicalName]));

  for (const row of rows) {
    const entries = result.get(row.noteId) ?? [];
    if (entries.length >= MAX_EVIDENCE_PER_NOTE) continue;
    entries.push({
      lineId: row.lineId,
      mentionId: row.mentionId,
      conceptId: row.conceptId,
      conceptName: names.get(row.conceptId) ?? "unknown food",
      path: row.pathTypes.map((type, index) => {
        const id = row.pathIds[index] as string;
        return {
          type: type as FoodRelationshipType,
          conceptId: id,
          conceptName: names.get(id) ?? "unknown food",
        };
      }),
    });
    result.set(row.noteId, entries);
  }
  return result;
}

export interface CategoryRulePreview {
  noteCount: number;
  examples: { noteId: string; title: string | null; evidence: CategoryEvidence }[];
}

/**
 * How many notes a rule would place in a category, with a few examples, before it is saved. Read-only.
 *
 * @example
 * await previewCategoryRule(chickenId, ["IS_A", "PART_OF"]) // { noteCount: 41, examples: [{ title: "Thai basil chicken", evidence: [...] }] }
 */
export async function previewCategoryRule(
  conceptId: string,
  traversal: readonly FoodRelationshipType[]
): Promise<CategoryRulePreview> {
  return prisma.$transaction(async (tx) => {
    const evidence = await evidenceForRule(tx, {
      targetId: conceptId,
      traversal: validateTraversal(traversal.length ? traversal : DEFAULT_CATEGORY_TRAVERSAL),
    });
    const exampleIds = [...evidence.keys()].slice(0, 5);
    const notes = await tx.note.findMany({
      where: { id: { in: exampleIds } },
      select: { id: true, title: true },
    });
    const titles = new Map(notes.map((note) => [note.id, note.title]));
    return {
      noteCount: evidence.size,
      examples: exampleIds.map((noteId) => ({
        noteId,
        title: titles.get(noteId) ?? null,
        evidence: evidence.get(noteId) ?? [],
      })),
    };
  });
}

export interface RecomputeSummary {
  added: number;
  updated: number;
  removed: number;
}

function sameEvidence(stored: Prisma.JsonValue | null, next: CategoryEvidence | null): boolean {
  return JSON.stringify(stored ?? null) === JSON.stringify(next ?? null);
}

/**
 * Brings one category's INFERRED memberships in line with the ingredients: new matches are added, lost matches removed, evidence refreshed. APPROVED rows only get fresh evidence, and EXCLUDED rows are never touched, so reviewer decisions survive reprocessing. With `noteId`, only that note is recomputed.
 */
async function recomputeCategoryIn(
  tx: Tx,
  categoryId: string,
  noteId?: string
): Promise<RecomputeSummary> {
  const summary: RecomputeSummary = { added: 0, updated: 0, removed: 0 };
  const rule = await loadRule(tx, categoryId);
  const evidence = rule ? await evidenceFor(tx, categoryId, noteId) : new Map<string, CategoryEvidence>();
  const revision = await getCurrentRevision(tx);

  const existing = await tx.noteCategory.findMany({
    where: { categoryId, ...(noteId ? { noteId } : {}) },
    select: { id: true, noteId: true, state: true, evidence: true, ruleVersion: true },
  });
  const byNote = new Map(existing.map((row) => [row.noteId, row]));

  const toCreate: Prisma.NoteCategoryCreateManyInput[] = [];
  for (const [matchedNoteId, noteEvidence] of evidence) {
    const row = byNote.get(matchedNoteId);
    if (!row) {
      toCreate.push({
        id: uuidv7(),
        noteId: matchedNoteId,
        categoryId,
        state: "INFERRED",
        origin: "CONCEPT_RULE",
        evidence: toJson(noteEvidence),
        ruleVersion: rule?.ruleVersion ?? null,
        lexiconRevision: revision,
      });
      continue;
    }
    if (row.state === "EXCLUDED") continue;
    if (sameEvidence(row.evidence, noteEvidence) && row.ruleVersion === rule?.ruleVersion) continue;
    await tx.noteCategory.update({
      where: { id: row.id },
      data: {
        evidence: toJson(noteEvidence),
        ...(row.state === "INFERRED"
          ? { ruleVersion: rule?.ruleVersion ?? null, lexiconRevision: revision }
          : {}),
      },
    });
    summary.updated++;
  }
  if (toCreate.length) {
    summary.added += (await tx.noteCategory.createMany({ data: toCreate, skipDuplicates: true })).count;
  }

  const lost = existing.filter((row) => !evidence.has(row.noteId));
  const lostInferred = lost.filter((row) => row.state === "INFERRED").map((row) => row.id);
  if (lostInferred.length) {
    summary.removed += (await tx.noteCategory.deleteMany({ where: { id: { in: lostInferred } } })).count;
  }
  const lostApprovedWithEvidence = lost
    .filter((row) => row.state === "APPROVED" && row.evidence !== null)
    .map((row) => row.id);
  if (lostApprovedWithEvidence.length) {
    await tx.noteCategory.updateMany({
      where: { id: { in: lostApprovedWithEvidence } },
      data: { evidence: Prisma.DbNull },
    });
    summary.updated += lostApprovedWithEvidence.length;
  }
  return summary;
}

function addSummary(total: RecomputeSummary, next: RecomputeSummary): RecomputeSummary {
  return {
    added: total.added + next.added,
    updated: total.updated + next.updated,
    removed: total.removed + next.removed,
  };
}

/**
 * Recomputes every CONCEPT category for one note, after its ingredients were parsed or reinterpreted.
 *
 * @example
 * await recomputeNoteCategories(noteId) // { added: 1, updated: 0, removed: 0 }
 */
export async function recomputeNoteCategories(noteId: string): Promise<RecomputeSummary> {
  const categories = await prisma.category.findMany({
    where: { kind: "CONCEPT" },
    select: { id: true },
  });
  let total: RecomputeSummary = { added: 0, updated: 0, removed: 0 };
  for (const category of categories) {
    total = addSummary(
      total,
      await prisma.$transaction((tx) => recomputeCategoryIn(tx, category.id, noteId), {
        timeout: 30_000,
      })
    );
  }
  return total;
}

/**
 * Recomputes one category across the corpus, after its rule changed. A MANUAL category (or one whose food is gone) only loses its INFERRED rows.
 *
 * @example
 * await recomputeCategory(chickenCategoryId) // { added: 12, updated: 3, removed: 1 }
 */
export async function recomputeCategory(categoryId: string): Promise<RecomputeSummary> {
  return prisma.$transaction((tx) => recomputeCategoryIn(tx, categoryId), { timeout: 120_000 });
}

/**
 * Recomputes every CONCEPT category, after a lexicon revision or reinterpretation run changed which foods lines mention or how foods relate.
 *
 * @example
 * await recomputeAllConceptCategories() // { added: 40, updated: 12, removed: 3 }
 */
export async function recomputeAllConceptCategories(): Promise<RecomputeSummary> {
  const categories = await prisma.category.findMany({
    where: { kind: "CONCEPT" },
    select: { id: true },
  });
  let total: RecomputeSummary = { added: 0, updated: 0, removed: 0 };
  for (const category of categories) {
    total = addSummary(total, await recomputeCategory(category.id));
  }
  return total;
}

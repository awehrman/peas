import { upsertDiscoveries } from "./discoveries.js";
import {
  type DbClient,
  OntologyError,
  parseOrThrow,
  toJson,
} from "./helpers.js";

import {
  type IngredientLineSyntax,
  type MentionSyntax,
  MentionSyntaxSchema,
  type Quantity,
  QuantitySchema,
  type Resolution,
  type ResolutionCandidate,
  ResolutionSchema,
  normalizeText,
} from "@peas/parser/v2";
import type {
  ParseMode,
  Prisma,
  ResolutionStatus,
  ValueSource,
} from "@prisma/client";

import { prisma } from "../../client.js";

/**
 * One parsed and resolved segment of a line. VERIFIED is never passed here; only `markMentionVerified` sets it.
 *
 * @example
 * {
 *   line: parseLineBest("1 lb boneless chicken thighs", { lexicon }),
 *   segmentIndex: 0,
 *   resolution: { resolverVersion: "1.0.0", candidates: [{ conceptId: "<chicken thigh>", score: 0.97, ... }], unresolved: [] },
 *   resolutionStatus: "AUTO_RESOLVED",
 * }
 */
export interface MentionInput {
  line: IngredientLineSyntax;
  segmentIndex: number;
  resolution: Resolution;
  resolutionStatus: Exclude<ResolutionStatus, "VERIFIED">;
}

export interface UpsertMentionsResult {
  /** Mentions created or rewritten, in input order. */
  mentionIds: string[];
  /** Verified mentions left untouched. */
  protectedIds: string[];
  /** Unverified mentions deleted because their segment no longer exists. */
  removedCount: number;
  /** VERIFIED_DRIFT discoveries recorded for protected mentions the new parse disagrees with. */
  driftDiscoveryIds: string[];
}

/**
 * Writes the mentions for one parsed line in the caller's transaction, keyed by (parsedLineId, segmentIndex). Idempotent: the same input produces the same rows. With `protectVerified` (the default), verified mentions are never overwritten or deleted; when the new parse disagrees, a VERIFIED_DRIFT discovery records it (decision D17).
 *
 * @example
 * await prisma.$transaction((tx) => upsertMentionsForLine(tx, line.id, [mentionInput]))
 * // { mentionIds: ["0193..."], protectedIds: [], removedCount: 0, driftDiscoveryIds: [] }
 */
export async function upsertMentionsForLine(
  tx: DbClient,
  parsedLineId: string,
  inputs: readonly MentionInput[],
  { protectVerified = true }: { protectVerified?: boolean } = {}
): Promise<UpsertMentionsResult> {
  const parsedLine = await tx.parsedIngredientLine.findUnique({
    where: { id: parsedLineId },
    select: { noteId: true },
  });
  if (!parsedLine)
    throw new OntologyError(`Parsed line ${parsedLineId} does not exist`);

  const existing = await tx.ingredientMention.findMany({
    where: { parsedLineId },
    select: {
      id: true,
      segmentIndex: true,
      verifiedAt: true,
      conceptId: true,
      spanStart: true,
      spanEnd: true,
    },
  });
  const existingByIndex = new Map(
    existing.map((mention) => [mention.segmentIndex, mention])
  );

  const result: UpsertMentionsResult = {
    mentionIds: [],
    protectedIds: [],
    removedCount: 0,
    driftDiscoveryIds: [],
  };
  const drifts: {
    mentionId: string;
    verifiedConceptId: string | null;
    proposedConceptId: string | null;
    spanStart: number;
    spanEnd: number;
    line: IngredientLineSyntax;
  }[] = [];
  const seenIndexes = new Set<number>();

  for (const input of inputs) {
    const prepared = prepareMention(input);
    seenIndexes.add(input.segmentIndex);
    const previous = existingByIndex.get(input.segmentIndex);

    if (previous?.verifiedAt && protectVerified) {
      result.protectedIds.push(previous.id);
      if (prepared.conceptId !== previous.conceptId) {
        drifts.push({
          mentionId: previous.id,
          verifiedConceptId: previous.conceptId,
          proposedConceptId: prepared.conceptId,
          spanStart: previous.spanStart,
          spanEnd: previous.spanEnd,
          line: input.line,
        });
      }
      continue;
    }

    const mentionId = previous
      ? (
          await tx.ingredientMention.update({
            where: { id: previous.id },
            data: { ...prepared.data, verifiedAt: null, verifiedById: null },
            select: { id: true },
          })
        ).id
      : (
          await tx.ingredientMention.create({
            data: { ...prepared.data, parsedLineId },
            select: { id: true },
          })
        ).id;

    if (previous) {
      await tx.mentionAttribute.deleteMany({ where: { mentionId } });
      await tx.mentionPreparation.deleteMany({ where: { mentionId } });
      await tx.mentionModifier.deleteMany({ where: { mentionId } });
    }
    await writeChildRows(tx, mentionId, prepared.candidate);
    result.mentionIds.push(mentionId);
  }

  for (const mention of existing) {
    if (seenIndexes.has(mention.segmentIndex)) continue;
    if (mention.verifiedAt && protectVerified) {
      result.protectedIds.push(mention.id);
      continue;
    }
    await tx.ingredientMention.delete({ where: { id: mention.id } });
    result.removedCount += 1;
  }

  if (drifts.length > 0) {
    result.driftDiscoveryIds = await upsertDiscoveries(
      tx,
      drifts.map((drift) => ({
        key: `mention:${drift.mentionId}`,
        payload: {
          type: "VERIFIED_DRIFT" as const,
          mentionId: drift.mentionId,
          verifiedConceptId: drift.verifiedConceptId,
          proposedConceptId: drift.proposedConceptId,
          parserVersion: drift.line.parserVersion,
          lexiconRevision: drift.line.lexiconRevision ?? 0,
        },
        evidence: [
          {
            mentionId: drift.mentionId,
            noteId: parsedLine.noteId,
            spanStart: drift.spanStart,
            spanEnd: drift.spanEnd,
          },
        ],
      })),
      Math.max(0, ...drifts.map((drift) => drift.line.lexiconRevision ?? 0))
    );
  }

  return result;
}

interface PreparedMention {
  data: Omit<Prisma.IngredientMentionUncheckedCreateInput, "parsedLineId">;
  conceptId: string | null;
  candidate: ResolutionCandidate | undefined;
}

function prepareMention(input: MentionInput): PreparedMention {
  const segment = input.line.segments[input.segmentIndex];
  if (!segment) {
    throw new OntologyError(
      `Segment ${input.segmentIndex} does not exist in "${input.line.raw}"`
    );
  }

  const resolution = parseOrThrow(
    ResolutionSchema,
    input.resolution,
    "IngredientMention.resolution"
  );
  const syntax: MentionSyntax = parseOrThrow(
    MentionSyntaxSchema,
    {
      line: {
        raw: input.line.raw,
        normalized: input.line.normalized,
        status: input.line.status,
        segmentationIndex: input.line.segmentationIndex,
        segmentCount: input.line.segments.length,
      },
      segment,
    },
    "IngredientMention.syntax"
  );

  const candidate = resolution.candidates[0];
  const conceptId =
    input.resolutionStatus === "AUTO_RESOLVED"
      ? (candidate?.conceptId ?? null)
      : null;
  const mode: ParseMode = input.line.mode;

  return {
    conceptId,
    candidate,
    data: {
      segmentIndex: input.segmentIndex,
      rawText: segment.span.text,
      normalizedText: normalizeText(segment.span.text).text.toLowerCase(),
      spanStart: segment.span.start,
      spanEnd: segment.span.end,
      syntax: toJson(syntax),
      quantity: segment.quantity ? toJson(segment.quantity) : undefined,
      conceptId,
      resolution: toJson(resolution),
      resolutionStatus: input.resolutionStatus,
      score: candidate?.score ?? null,
      mode,
      parserVersion: input.line.parserVersion,
      normalizerVersion: input.line.normalizerVersion,
      resolverVersion: resolution.resolverVersion,
      lexiconRevision: input.line.lexiconRevision ?? 0,
    },
  };
}

async function writeChildRows(
  tx: DbClient,
  mentionId: string,
  candidate: ResolutionCandidate | undefined
): Promise<void> {
  if (!candidate) return;

  const attributes = new Map(
    candidate.attributes.map((attribute) => [
      attribute.attributeValueId,
      attribute,
    ])
  );
  if (attributes.size > 0) {
    await tx.mentionAttribute.createMany({
      data: [...attributes.values()].map((attribute) => ({
        mentionId,
        attributeValueId: attribute.attributeValueId,
        lexiconEntryId: attribute.lexiconEntryId,
        source: attribute.source,
        spanStart: attribute.span?.start ?? null,
        spanEnd: attribute.span?.end ?? null,
      })),
    });
  }
  if (candidate.preparations.length > 0) {
    await tx.mentionPreparation.createMany({
      data: candidate.preparations.map((preparation, order) => ({
        mentionId,
        order,
        preparationId: preparation.preparationId,
        degreeKey: preparation.degreeKey,
        position: preparation.position,
        spanStart: preparation.span.start,
        spanEnd: preparation.span.end,
      })),
    });
  }
  if (candidate.modifiers.length > 0) {
    await tx.mentionModifier.createMany({
      data: candidate.modifiers.map((modifier, order) => ({
        mentionId,
        order,
        role: modifier.role,
        valueKey: modifier.valueKey,
        spanStart: modifier.span.start,
        spanEnd: modifier.span.end,
      })),
    });
  }
}

export interface MentionRecord {
  id: string;
  segmentIndex: number;
  rawText: string;
  conceptId: string | null;
  conceptName: string | null;
  resolutionStatus: ResolutionStatus;
  score: number | null;
  quantity: Quantity | null;
  verifiedAt: string | null;
}

/**
 * The mentions of one line, in segment order.
 *
 * @example
 * await getMentionsForLine(lineId)
 * // [{ segmentIndex: 0, rawText: "1 tbsp butter", conceptName: "butter", resolutionStatus: "AUTO_RESOLVED", ... }, { segmentIndex: 1, ... }]
 */
export async function getMentionsForLine(
  parsedLineId: string,
  db: DbClient = prisma
): Promise<MentionRecord[]> {
  const rows = await db.ingredientMention.findMany({
    where: { parsedLineId },
    orderBy: { segmentIndex: "asc" },
    include: { concept: { select: { canonicalName: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    segmentIndex: row.segmentIndex,
    rawText: row.rawText,
    conceptId: row.conceptId,
    conceptName: row.concept?.canonicalName ?? null,
    resolutionStatus: row.resolutionStatus,
    score: row.score,
    quantity:
      row.quantity === null
        ? null
        : parseOrThrow(
            QuantitySchema,
            row.quantity,
            "IngredientMention.quantity"
          ),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
  }));
}

export interface MentionDetailRecord extends MentionRecord {
  parsedLineId: string;
  syntax: MentionSyntax;
  resolution: Resolution;
  mode: ParseMode;
  parserVersion: string;
  normalizerVersion: string;
  resolverVersion: string;
  lexiconRevision: number;
  verifiedById: string | null;
  attributes: {
    attributeValueId: string;
    definitionKey: string;
    valueKey: string;
    label: string;
    source: ValueSource;
    spanStart: number | null;
    spanEnd: number | null;
  }[];
  preparations: {
    preparationId: string;
    key: string;
    degreeKey: string | null;
    position: "PRE_HEAD" | "POST_HEAD";
    spanStart: number;
    spanEnd: number;
  }[];
  modifiers: {
    role: string;
    valueKey: string;
    spanStart: number;
    spanEnd: number;
  }[];
}

/**
 * A mention with its validated syntax and resolution, for the mention review panel.
 *
 * @example
 * const detail = await getMentionDetail(mentionId);
 * // detail.syntax.segment.quantity, detail.resolution.candidates, detail.attributes -> [{ definitionKey: "bone", valueKey: "boneless", ... }]
 */
export async function getMentionDetail(
  id: string,
  db: DbClient = prisma
): Promise<MentionDetailRecord | null> {
  const row = await db.ingredientMention.findUnique({
    where: { id },
    include: {
      concept: { select: { canonicalName: true } },
      attributes: {
        include: {
          attributeValue: {
            include: { definition: { select: { key: true } } },
          },
        },
      },
      preparations: {
        orderBy: { order: "asc" },
        include: { preparation: { select: { key: true } } },
      },
      modifiers: { orderBy: { order: "asc" } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    parsedLineId: row.parsedLineId,
    segmentIndex: row.segmentIndex,
    rawText: row.rawText,
    conceptId: row.conceptId,
    conceptName: row.concept?.canonicalName ?? null,
    resolutionStatus: row.resolutionStatus,
    score: row.score,
    quantity:
      row.quantity === null
        ? null
        : parseOrThrow(
            QuantitySchema,
            row.quantity,
            "IngredientMention.quantity"
          ),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    syntax: parseOrThrow(
      MentionSyntaxSchema,
      row.syntax,
      "IngredientMention.syntax"
    ),
    resolution: parseOrThrow(
      ResolutionSchema,
      row.resolution,
      "IngredientMention.resolution"
    ),
    mode: row.mode,
    parserVersion: row.parserVersion,
    normalizerVersion: row.normalizerVersion,
    resolverVersion: row.resolverVersion,
    lexiconRevision: row.lexiconRevision,
    verifiedById: row.verifiedById,
    attributes: row.attributes.map((attribute) => ({
      attributeValueId: attribute.attributeValueId,
      definitionKey: attribute.attributeValue.definition.key,
      valueKey: attribute.attributeValue.key,
      label: attribute.attributeValue.label,
      source: attribute.source,
      spanStart: attribute.spanStart,
      spanEnd: attribute.spanEnd,
    })),
    preparations: row.preparations.map((preparation) => ({
      preparationId: preparation.preparationId,
      key: preparation.preparation.key,
      degreeKey: preparation.degreeKey,
      position: preparation.position,
      spanStart: preparation.spanStart,
      spanEnd: preparation.spanEnd,
    })),
    modifiers: row.modifiers.map((modifier) => ({
      role: modifier.role,
      valueKey: modifier.valueKey,
      spanStart: modifier.spanStart,
      spanEnd: modifier.spanEnd,
    })),
  };
}

export interface MentionTextMatch {
  id: string;
  parsedLineId: string;
  rawText: string;
  normalizedText: string;
  similarity: number;
}

/**
 * Mentions whose text contains or closely resembles the query, using the pg_trgm index. Lexicon previews use this to narrow which mentions to reinterpret (decision D20).
 *
 * @example
 * await findMentionsByText("olive oil", { excludeVerified: true })
 * // [{ rawText: "2 tbsp olive oil", similarity: 0.62 }, { rawText: "1/4 cup extra-virgin olive oil", similarity: 0.41 }]
 */
export async function findMentionsByText(
  query: string,
  {
    excludeVerified = false,
    limit = 50,
  }: { excludeVerified?: boolean; limit?: number } = {},
  db: DbClient = prisma
): Promise<MentionTextMatch[]> {
  const needle = normalizeText(query).text.toLowerCase().trim();
  if (!needle) return [];
  const like = `%${needle.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

  const rows = await db.$queryRaw<MentionTextMatch[]>`
    SELECT m.id::text AS id, m."parsedLineId", m."rawText", m."normalizedText",
           similarity(m."normalizedText", ${needle})::float8 AS similarity
    FROM "IngredientMention" m
    WHERE (m."normalizedText" ILIKE ${like} OR m."normalizedText" % ${needle})
      AND (${excludeVerified} = false OR m."verifiedAt" IS NULL)
    ORDER BY similarity DESC, m.id
    LIMIT ${limit}
  `;
  return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
}

/**
 * Marks a mention as checked by a person, optionally correcting its concept and attributes. Verified mentions are protected from later automatic rewrites.
 *
 * @example
 * await markMentionVerified(tx, mentionId, userId)
 * await markMentionVerified(tx, mentionId, userId, { conceptId: shallotId, attributeValueIds: [] })
 */
export async function markMentionVerified(
  tx: DbClient,
  id: string,
  userId: string,
  correction?: { conceptId?: string | null; attributeValueIds?: string[] }
): Promise<void> {
  await tx.ingredientMention.update({
    where: { id },
    data: {
      verifiedAt: new Date(),
      verifiedById: userId,
      resolutionStatus: "VERIFIED",
      ...(correction && "conceptId" in correction
        ? { conceptId: correction.conceptId ?? null }
        : {}),
    },
  });

  if (correction?.attributeValueIds) {
    await tx.mentionAttribute.deleteMany({ where: { mentionId: id } });
    const unique = [...new Set(correction.attributeValueIds)];
    if (unique.length > 0) {
      await tx.mentionAttribute.createMany({
        data: unique.map((attributeValueId) => ({
          mentionId: id,
          attributeValueId,
          source: "MANUAL" as const,
        })),
      });
    }
  }
}

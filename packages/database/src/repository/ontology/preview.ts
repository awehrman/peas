import { applyDecisionInTransaction } from "./apply-decision.js";
import { type LineToProcess, processLines } from "./backfill.js";
import { type DbClient, OntologyError, parseOrThrow } from "./helpers.js";
import { loadResolverSnapshot } from "./resolver-context.js";

import {
  type DecisionPayload,
  DecisionPayloadSchema,
  HIERARCHICAL_RELATIONSHIP_TYPES,
  type ResolutionSummary,
  type ResolverContext,
  type ResolverSnapshot,
  type SegmentResolution,
  applyDecisionToSnapshot,
  buildResolverContext,
  decisionScope,
  diffResolution,
  processIngredientLine,
} from "@peas/parser/v2";
import { Prisma } from "@prisma/client";

import { prisma } from "../../client.js";

export interface AffectedMention {
  mentionId: string;
  parsedLineId: string;
  segmentIndex: number;
  partIndex: number;
  lineText: string;
  noteId: string | null;
  noteTitle: string | null;
  conceptId: string | null;
  verifiedAt: Date | null;
}

export interface DecisionScope {
  phrases: string[];
  conceptIds: string[];
  mentionIds: string[];
}

/**
 * The mentions a decision can affect (decision D20): line text containing a phrase (case-insensitive substring), a stored or candidate concept among `conceptIds` and their hierarchy descendants, or an explicit mention id.
 *
 * @example
 * await findAffectedMentions({ phrases: ["confectioners sugar"], conceptIds: [], mentionIds: [] }, context, { limit: 1000 })
 */
export async function findAffectedMentions(
  scope: DecisionScope,
  context: ResolverContext,
  { limit = 5000 }: { limit?: number } = {},
  db: DbClient = prisma
): Promise<AffectedMention[]> {
  const conceptIds = new Set(scope.conceptIds);
  for (const id of scope.conceptIds)
    for (const descendant of context.ontology.descendants(
      id,
      HIERARCHICAL_RELATIONSHIP_TYPES
    ))
      conceptIds.add(descendant);

  const conditions: Prisma.Sql[] = [];
  for (const phrase of scope.phrases) {
    const like = `%${phrase.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    conditions.push(Prisma.sql`l.reference ILIKE ${like}`);
  }
  if (conceptIds.size > 0) {
    const ids = [...conceptIds];
    conditions.push(
      Prisma.sql`m."conceptId" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})`
    );
    for (const id of ids)
      conditions.push(
        Prisma.sql`m.resolution->'candidates' @> ${JSON.stringify([{ conceptId: id }])}::jsonb`
      );
  }
  if (scope.mentionIds.length > 0) {
    conditions.push(
      Prisma.sql`m.id IN (${Prisma.join(scope.mentionIds.map((id) => Prisma.sql`${id}::uuid`))})`
    );
  }
  if (conditions.length === 0) return [];

  return db.$queryRaw<AffectedMention[]>`
    SELECT m.id::text AS "mentionId", m."parsedLineId", m."segmentIndex", m."partIndex", l.reference AS "lineText",
           l."noteId", n.title AS "noteTitle", m."conceptId"::text AS "conceptId", m."verifiedAt"
    FROM "IngredientMention" m
    JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
    LEFT JOIN "Note" n ON n.id = l."noteId"
    WHERE l."isActive" = true AND (${Prisma.join(conditions, " OR ")})
    ORDER BY m.id
    LIMIT ${limit}
  `;
}

export interface PreviewCounts {
  scanned: number;
  affected: number;
  newlyResolved: number;
  conceptChanged: number;
  attributesChanged: number;
  becameAmbiguous: number;
  becameUnresolved: number;
  verifiedConflicts: number;
}

export interface PreviewExample {
  mentionId: string;
  noteId: string | null;
  noteTitle: string | null;
  lineText: string;
  before: ResolutionSummary;
  after: ResolutionSummary;
  /** A verified mention the decision would read differently; verified mentions are never changed automatically. */
  verifiedConflict: boolean;
}

export interface DecisionPreview {
  revision: number;
  counts: PreviewCounts;
  examples: PreviewExample[];
  /** True when more mentions matched than were scanned. */
  truncated: boolean;
}

/**
 * Before/after impact of a decision with no side effects (Phase 4d): applies it to an in-memory copy of the resolver snapshot (REVERT is applied in a transaction that is rolled back), re-resolves the affected mentions with both, and reports counts plus examples, verified conflicts first.
 *
 * @example
 * const preview = await previewDecision({ type: "MAP_TO_CONCEPT", phrase: "confectioners sugar", conceptId, kind: "ALIAS" });
 * // { counts: { affected: 12, newlyResolved: 12, ... }, examples: [{ lineText: "2 tbsp confectioners sugar", before: { text: "unresolved: confectioners sugar" }, after: { text: "powdered sugar" } }] }
 */
export async function previewDecision(
  rawPayload: unknown,
  {
    exampleLimit = 20,
    scanLimit = 5000,
    userId,
  }: { exampleLimit?: number; scanLimit?: number; userId?: string } = {}
): Promise<DecisionPreview> {
  const payload = parseOrThrow(
    DecisionPayloadSchema,
    rawPayload,
    "Decision preview payload"
  );
  const snapshot = await loadResolverSnapshot();
  const beforeContext = buildResolverContext(snapshot);
  const { after, scope } = await snapshotAfter(snapshot, payload, userId);
  const afterContext = buildResolverContext(after);

  const affected = await findAffectedMentions(scope, beforeContext, {
    limit: scanLimit + 1,
  });
  const truncated = affected.length > scanLimit;
  const scanned = affected.slice(0, scanLimit);

  const cache = new Map<
    string,
    { before: SegmentResolution[]; after: SegmentResolution[] }
  >();
  const counts: PreviewCounts = {
    scanned: scanned.length,
    affected: 0,
    newlyResolved: 0,
    conceptChanged: 0,
    attributesChanged: 0,
    becameAmbiguous: 0,
    becameUnresolved: 0,
    verifiedConflicts: 0,
  };
  const examples: PreviewExample[] = [];

  for (const mention of scanned) {
    let resolved = cache.get(mention.lineText);
    if (!resolved) {
      resolved = {
        before: processIngredientLine(mention.lineText, beforeContext).mentions,
        after: processIngredientLine(mention.lineText, afterContext).mentions,
      };
      cache.set(mention.lineText, resolved);
    }
    const pick = (mentions: SegmentResolution[]) =>
      mentions.find(
        (candidate) =>
          candidate.segmentIndex === mention.segmentIndex &&
          candidate.partIndex === mention.partIndex
      );
    const diff = diffResolution(
      pick(resolved.before),
      pick(resolved.after),
      beforeContext,
      afterContext
    );
    if (!diff.changed) continue;

    const verifiedConflict =
      mention.verifiedAt !== null && diff.after.conceptId !== mention.conceptId;
    counts.affected += 1;
    if (diff.newlyResolved) counts.newlyResolved += 1;
    if (diff.conceptChanged) counts.conceptChanged += 1;
    if (diff.attributesChanged) counts.attributesChanged += 1;
    if (diff.becameAmbiguous) counts.becameAmbiguous += 1;
    if (diff.becameUnresolved) counts.becameUnresolved += 1;
    if (verifiedConflict) counts.verifiedConflicts += 1;
    examples.push({
      mentionId: mention.mentionId,
      noteId: mention.noteId,
      noteTitle: mention.noteTitle,
      lineText: mention.lineText,
      before: diff.before,
      after: diff.after,
      verifiedConflict,
    });
  }

  examples.sort(
    (a, b) => Number(b.verifiedConflict) - Number(a.verifiedConflict)
  );
  return {
    revision: after.revision,
    counts,
    examples: examples.slice(0, exampleLimit),
    truncated,
  };
}

class PreviewRollback extends Error {}

async function snapshotAfter(
  snapshot: ResolverSnapshot,
  payload: DecisionPayload,
  userId: string | undefined
): Promise<{ after: ResolverSnapshot; scope: DecisionScope }> {
  if (payload.type !== "REVERT")
    return {
      after: applyDecisionToSnapshot(snapshot, payload),
      scope: decisionScope(payload, snapshot),
    };

  if (!userId)
    throw new OntologyError("Previewing a revert needs the reviewing user");
  const target = await prisma.lexiconDecision.findUnique({
    where: { id: payload.decisionId },
    select: { payload: true },
  });
  if (!target) throw new OntologyError("That decision does not exist");
  const scope = decisionScope(
    parseOrThrow(
      DecisionPayloadSchema,
      target.payload,
      "LexiconDecision.payload"
    ),
    snapshot
  );

  let after: ResolverSnapshot | undefined;
  try {
    await prisma.$transaction(
      async (tx) => {
        await applyDecisionInTransaction(tx, { payload, userId });
        after = await loadResolverSnapshot(tx);
        throw new PreviewRollback();
      },
      { timeout: 30_000, maxWait: 10_000 }
    );
  } catch (error) {
    if (!(error instanceof PreviewRollback)) throw error;
  }
  if (!after) throw new OntologyError("Could not preview the revert");
  return { after, scope };
}

export interface ReinterpretResult {
  /** What the decision can affect, for handing a large reinterpretation to the queue. */
  scope: DecisionScope;
  /** Lines whose mentions were rewritten in this request. */
  linesReprocessed: number;
  mentionsChanged: number;
  /** More lines matched than the in-request limit; run `yarn workspace @peas/queue reinterpret --revision <r>`. */
  needsBackgroundReinterpret: boolean;
}

/**
 * Reinterprets the mentions a decision affects at the current revision (Phase 4e): in this request when at most `limit` lines match, otherwise it reports that a background run is needed.
 *
 * @example
 * const { revision, payload } = await applyDecision(input);
 * await reinterpretAffected(payload, { limit: 1000 }) // { linesReprocessed: 12, mentionsChanged: 12, needsBackgroundReinterpret: false }
 */
export async function reinterpretAffected(
  payload: DecisionPayload,
  {
    limit = 1000,
    extraScope,
  }: { limit?: number; extraScope?: DecisionScope } = {}
): Promise<ReinterpretResult> {
  const snapshot = await loadResolverSnapshot();
  const context = buildResolverContext(snapshot);
  let scope = decisionScope(payload, snapshot);
  if (payload.type === "REVERT") {
    const target = await prisma.lexiconDecision.findUnique({
      where: { id: payload.decisionId },
      select: { payload: true },
    });
    if (target)
      scope = decisionScope(
        parseOrThrow(
          DecisionPayloadSchema,
          target.payload,
          "LexiconDecision.payload"
        ),
        snapshot
      );
  }
  if (extraScope) {
    scope = {
      phrases: [...scope.phrases, ...extraScope.phrases],
      conceptIds: [...scope.conceptIds, ...extraScope.conceptIds],
      mentionIds: [...scope.mentionIds, ...extraScope.mentionIds],
    };
  }

  const affected = await findAffectedMentions(scope, context, {
    limit: limit * 4 + 1,
  });
  const lineIds = [...new Set(affected.map((mention) => mention.parsedLineId))];
  if (lineIds.length > limit)
    return {
      scope,
      linesReprocessed: 0,
      mentionsChanged: 0,
      needsBackgroundReinterpret: true,
    };
  if (lineIds.length === 0)
    return {
      scope,
      linesReprocessed: 0,
      mentionsChanged: 0,
      needsBackgroundReinterpret: false,
    };

  const lines: LineToProcess[] = await prisma.parsedIngredientLine.findMany({
    where: { id: { in: lineIds } },
    select: { id: true, reference: true, noteId: true },
  });
  const result = await prisma.$transaction(
    (tx) => processLines(tx, lines, context),
    { timeout: 120_000, maxWait: 10_000 }
  );
  return {
    scope,
    linesReprocessed: result.lines,
    mentionsChanged: result.mentionsChanged,
    needsBackgroundReinterpret: false,
  };
}

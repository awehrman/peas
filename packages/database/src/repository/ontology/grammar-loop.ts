import { type DiscoveryCandidate, upsertDiscoveries } from "./discoveries.js";
import { type DbClient, OntologyError, parseOrThrow } from "./helpers.js";

import {
  type IngredientLineResult,
  PARSER_VERSION,
  type Quantity,
  QuantitySchema,
  ResolutionSchema,
  type ResolverContext,
  describeQuantity,
  discover,
  processIngredientLine,
  structureSignature,
} from "@peas/parser/v2";

import { prisma } from "../../client.js";

/**
 * "Mark as noise" on a structural discovery: its lines are not ingredient lines (a heading, an equipment note, an OCR artifact). They become inactive, which drops them from mentions, counts, and reparsing, and the discovery is rejected.
 *
 * @example
 * await markDiscoveryAsNoise(discoveryId) // { linesDeactivated: 3 }
 */
export async function markDiscoveryAsNoise(
  discoveryId: string,
  db: DbClient = prisma
): Promise<{ linesDeactivated: number }> {
  const run = async (tx: DbClient) => {
    const discovery = await tx.discovery.findUnique({
      where: { id: discoveryId },
      select: {
        type: true,
        status: true,
        evidence: { select: { mention: { select: { parsedLineId: true } } } },
      },
    });
    if (!discovery) throw new OntologyError("That discovery does not exist");
    if (discovery.type !== "STRUCTURAL_PATTERN")
      throw new OntologyError("Only structural patterns can be marked as noise");
    const lineIds = [
      ...new Set(discovery.evidence.map((row) => row.mention.parsedLineId)),
    ];
    const { count } = await tx.parsedIngredientLine.updateMany({
      where: { id: { in: lineIds }, isActive: true },
      data: { isActive: false },
    });
    await tx.discovery.update({
      where: { id: discoveryId },
      data: { status: "REJECTED" },
    });
    return { linesDeactivated: count };
  };
  return db === prisma ? prisma.$transaction((tx) => run(tx)) : run(db);
}

export interface PendingFixtureLine {
  lineId: string;
  input: string;
  noteId: string | null;
}

/**
 * Example lines for a structural pattern, for `pull:fixtures`: by discovery (its evidence) or by signature (active lines whose current parse has that signature). Distinct texts, at most `limit`.
 *
 * @example
 * await pendingFixtureLines({ discoveryId, limit: 10 }) // [{ input: "rosemary a few sprigs", ... }]
 */
export async function pendingFixtureLines(
  {
    discoveryId,
    signature,
    limit = 10,
    scanLimit = 5000,
  }: { discoveryId?: string; signature?: string; limit?: number; scanLimit?: number },
  db: DbClient = prisma
): Promise<PendingFixtureLine[]> {
  const unique = (rows: PendingFixtureLine[]) => {
    const seen = new Set<string>();
    return rows
      .filter((row) => {
        if (seen.has(row.input)) return false;
        seen.add(row.input);
        return true;
      })
      .slice(0, limit);
  };

  if (discoveryId) {
    const evidence = await db.discoveryEvidence.findMany({
      where: { discoveryId },
      select: {
        mention: {
          select: {
            parsedLine: { select: { id: true, reference: true, noteId: true } },
          },
        },
      },
      take: scanLimit,
    });
    return unique(
      evidence.map(({ mention }) => ({
        lineId: mention.parsedLine.id,
        input: mention.parsedLine.reference,
        noteId: mention.parsedLine.noteId,
      }))
    );
  }
  if (!signature) throw new OntologyError("Pass a discovery id or a signature");

  const { parseLineBest } = await import("@peas/parser/v2");
  const lines = await db.parsedIngredientLine.findMany({
    where: { isActive: true },
    select: { id: true, reference: true, noteId: true },
    orderBy: { id: "asc" },
    take: scanLimit,
  });
  return unique(
    lines
      .filter((line) => structureSignature(parseLineBest(line.reference)) === signature)
      .map((line) => ({ lineId: line.id, input: line.reference, noteId: line.noteId }))
  );
}

/**
 * The exploratory sweep (Phase 6f): re-reads unresolved and needs-review mentions in EXPLORATORY mode (proposed entries and alternative segmentations included) and records the discoveries that suggests, tagged `source: "exploratory"`. Mentions are never written, and existing discoveries keep their payload.
 *
 * @example
 * await exploratorySweep(context, { limit: 2000 }) // { linesScanned: 412, discoveriesTouched: 37 }
 */
export async function exploratorySweep(
  context: ResolverContext,
  { limit = 2000 }: { limit?: number } = {},
  db: DbClient = prisma
): Promise<{ linesScanned: number; discoveriesTouched: number }> {
  const mentions = await db.ingredientMention.findMany({
    where: {
      resolutionStatus: { in: ["UNRESOLVED", "NEEDS_REVIEW"] },
      verifiedAt: null,
      parsedLine: { isActive: true },
    },
    select: {
      id: true,
      segmentIndex: true,
      spanStart: true,
      spanEnd: true,
      parsedLine: { select: { id: true, reference: true, noteId: true } },
    },
    orderBy: { parsedLineId: "asc" },
    take: limit,
  });
  const byLine = new Map<string, typeof mentions>();
  for (const mention of mentions) {
    const list = byLine.get(mention.parsedLine.id) ?? [];
    list.push(mention);
    byLine.set(mention.parsedLine.id, list);
  }

  const grouped = new Map<string, DiscoveryCandidate>();
  for (const lineMentions of byLine.values()) {
    const line = lineMentions[0]?.parsedLine;
    if (!line) continue;
    const result = processIngredientLine(line.reference, context, {
      mode: "EXPLORATORY",
    });
    for (const discovery of discover(result, context)) {
      const inSegment = lineMentions.filter(
        (mention) => mention.segmentIndex === discovery.segmentIndex
      );
      const mention =
        inSegment.find(
          (candidate) =>
            discovery.span.start >= candidate.spanStart &&
            discovery.span.end <= candidate.spanEnd
        ) ?? inSegment[0];
      if (!mention) continue;
      const id = `${discovery.payload.type}|${discovery.key}`;
      const group: DiscoveryCandidate = grouped.get(id) ?? {
        key: discovery.key,
        payload: { ...discovery.payload, source: "exploratory" as const },
        evidence: [],
      };
      if (!group.evidence.some((row) => row.mentionId === mention.id))
        group.evidence.push({
          mentionId: mention.id,
          noteId: line.noteId,
          spanStart: discovery.span.start,
          spanEnd: discovery.span.end,
        });
      grouped.set(id, group);
    }
  }

  if (grouped.size > 0)
    await (db === prisma
      ? prisma.$transaction(
          (tx) =>
            upsertDiscoveries(tx, [...grouped.values()], context.revision, {
              keepExistingPayload: true,
            }),
          { timeout: 120_000, maxWait: 10_000 }
        )
      : upsertDiscoveries(db, [...grouped.values()], context.revision, {
          keepExistingPayload: true,
        }));
  return { linesScanned: byLine.size, discoveriesTouched: grouped.size };
}

export const REPARSE_CATEGORIES = [
  "parseStatus",
  "quantity",
  "headConcept",
  "unresolved",
  "segments",
] as const;
export type ReparseCategory = (typeof REPARSE_CATEGORIES)[number];

export interface ReparseExample {
  lineId: string;
  lineText: string;
  before: string;
  after: string;
}

export interface ReparseReport {
  parserVersion: string;
  lexiconRevision: number;
  /** Stored mentions by the parser version that wrote them. */
  storedVersions: Record<string, number>;
  linesScanned: number;
  mentionsCompared: number;
  counts: Record<ReparseCategory, number>;
  examples: Record<ReparseCategory, ReparseExample[]>;
  /** Verified mentions whose structure would change; reparsing never touches them, so they need a person. */
  verifiedConflicts: ReparseExample[];
}

const quantityText = (quantity: Quantity | null | undefined) =>
  quantity ? describeQuantity(quantity) : "(none)";

/**
 * The dry-run reparse (Phase 6d): processes every active line with mentions using the working-tree parser and the current lexicon, and compares the result with what is stored (parse status, quantity, head concept, unresolved words, segment count) without writing anything.
 *
 * @example
 * const report = await dryRunReparse(context, { examplesPerCategory: 50 });
 * report.counts // { parseStatus: 3, quantity: 41, headConcept: 2, unresolved: 7, segments: 0 }
 */
export async function dryRunReparse(
  context: ResolverContext,
  {
    examplesPerCategory = 50,
    batchSize = 500,
    lineLimit = Number.POSITIVE_INFINITY,
  }: { examplesPerCategory?: number; batchSize?: number; lineLimit?: number } = {},
  db: DbClient = prisma
): Promise<ReparseReport> {
  const report: ReparseReport = {
    parserVersion: PARSER_VERSION,
    lexiconRevision: context.revision,
    storedVersions: {},
    linesScanned: 0,
    mentionsCompared: 0,
    counts: { parseStatus: 0, quantity: 0, headConcept: 0, unresolved: 0, segments: 0 },
    examples: { parseStatus: [], quantity: [], headConcept: [], unresolved: [], segments: [] },
    verifiedConflicts: [],
  };
  const note = (category: ReparseCategory, example: ReparseExample) => {
    report.counts[category] += 1;
    if (report.examples[category].length < examplesPerCategory)
      report.examples[category].push(example);
  };

  let cursor: string | undefined;
  while (report.linesScanned < lineLimit) {
    const lines = await db.parsedIngredientLine.findMany({
      where: { isActive: true, mentions: { some: {} } },
      orderBy: { id: "asc" },
      take: Math.min(batchSize, lineLimit - report.linesScanned),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        reference: true,
        mentions: {
          orderBy: [{ segmentIndex: "asc" }, { partIndex: "asc" }],
          select: {
            segmentIndex: true,
            partIndex: true,
            parserVersion: true,
            conceptId: true,
            verifiedAt: true,
            quantity: true,
            resolution: true,
            syntax: true,
          },
        },
      },
    });
    if (lines.length === 0) break;
    cursor = lines[lines.length - 1]?.id;

    for (const line of lines) {
      report.linesScanned += 1;
      const result: IngredientLineResult = processIngredientLine(
        line.reference,
        context
      );
      const example = (before: string, after: string): ReparseExample => ({
        lineId: line.id,
        lineText: line.reference,
        before,
        after,
      });
      if (result.mentions.length !== line.mentions.length)
        note(
          "segments",
          example(`${line.mentions.length} mentions`, `${result.mentions.length} mentions`)
        );

      for (const stored of line.mentions) {
        report.mentionsCompared += 1;
        report.storedVersions[stored.parserVersion] =
          (report.storedVersions[stored.parserVersion] ?? 0) + 1;
        const fresh = result.mentions.find(
          (mention) =>
            mention.segmentIndex === stored.segmentIndex &&
            mention.partIndex === stored.partIndex
        );
        const storedStatus =
          (stored.syntax as { line?: { status?: string } } | null)?.line?.status ??
          "PARSED";
        const storedQuantity = quantityText(
          stored.quantity
            ? parseOrThrow(QuantitySchema, stored.quantity, "IngredientMention.quantity")
            : null
        );
        const freshQuantity = quantityText(
          result.line.segments[stored.segmentIndex]?.quantity
        );
        const resolution = parseOrThrow(
          ResolutionSchema,
          stored.resolution,
          "IngredientMention.resolution"
        );
        const storedUnresolved = resolution.unresolved.map((span) => span.text).join(", ");
        const freshUnresolved = (fresh?.resolution.unresolved ?? [])
          .map((span) => span.text)
          .join(", ");
        const freshConcept =
          fresh && fresh.status !== "UNRESOLVED"
            ? (fresh.resolution.candidates[0]?.conceptId ?? null)
            : null;
        const conceptName = (id: string | null) =>
          id ? (context.ontology.concept(id)?.canonicalName ?? id) : "(none)";

        const structureChanged =
          storedStatus !== result.line.status || storedQuantity !== freshQuantity;
        if (stored.verifiedAt) {
          if (structureChanged)
            report.verifiedConflicts.push(
              example(
                `${storedStatus}, ${storedQuantity}`,
                `${result.line.status}, ${freshQuantity}`
              )
            );
          continue;
        }
        if (storedStatus !== result.line.status)
          note("parseStatus", example(storedStatus, result.line.status));
        if (storedQuantity !== freshQuantity)
          note("quantity", example(storedQuantity, freshQuantity));
        if (stored.conceptId !== freshConcept)
          note(
            "headConcept",
            example(conceptName(stored.conceptId), conceptName(freshConcept))
          );
        if (storedUnresolved !== freshUnresolved)
          note(
            "unresolved",
            example(storedUnresolved || "(none)", freshUnresolved || "(none)")
          );
      }
    }
  }
  return report;
}

const CATEGORY_TITLES: Record<ReparseCategory, string> = {
  parseStatus: "Parse status",
  quantity: "Quantity",
  headConcept: "Head concept",
  unresolved: "Unresolved words",
  segments: "Segment count",
};

const cell = (text: string) => text.replace(/\|/g, "\\|");

/**
 * The dry-run report as markdown, for `packages/parser/fixtures/reports/reparse-<version>.md` and the pull request.
 *
 * @example
 * writeFileSync(`fixtures/reports/reparse-${report.parserVersion}.md`, formatReparseReport(report))
 */
export function formatReparseReport(report: ReparseReport): string {
  const stored = Object.entries(report.storedVersions)
    .map(([version, count]) => `${version}: ${count}`)
    .join(", ");
  const lines = [
    `# Dry-run reparse with parser ${report.parserVersion}`,
    "",
    `Generated by \`yarn workspace @peas/queue reparse:dry-run\` at lexicon revision ${report.lexiconRevision}. Nothing was written.`,
    "",
    `${report.linesScanned} lines, ${report.mentionsCompared} stored mentions${stored ? ` (stored by ${stored})` : ""}.`,
    "",
    "## What would change",
    "",
    "| Category | Mentions |",
    "| --- | ---: |",
    ...REPARSE_CATEGORIES.map(
      (category) => `| ${CATEGORY_TITLES[category]} | ${report.counts[category]} |`
    ),
    `| Verified mentions whose structure would change (never applied) | ${report.verifiedConflicts.length} |`,
  ];
  const table = (examples: ReparseExample[]) => [
    "| Line | Before | After |",
    "| --- | --- | --- |",
    ...examples.map(
      (example) =>
        `| ${cell(example.lineText)} | ${cell(example.before)} | ${cell(example.after)} |`
    ),
  ];
  for (const category of REPARSE_CATEGORIES) {
    const examples = report.examples[category];
    if (examples.length === 0) continue;
    lines.push("", `## ${CATEGORY_TITLES[category]}`, "", ...table(examples));
  }
  if (report.verifiedConflicts.length > 0)
    lines.push(
      "",
      "## Verified mentions to review",
      "",
      "These were verified by a person, so a reparse leaves them alone. Re-verify them if the new reading is right.",
      "",
      ...table(report.verifiedConflicts)
    );
  return `${lines.join("\n")}\n`;
}

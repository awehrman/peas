import type { ResolverContext } from "./context.js";
import type {
  Resolution,
  ResolutionCandidate,
  ResolvedAttribute,
  ResolvedModifier,
  ResolvedPreparation,
} from "./schemas.js";
import { scoreCandidate } from "./scoring.js";
import { RESOLVER_VERSION } from "./version.js";

import type {
  IngredientLineSyntax,
  IngredientSegmentSyntax,
  LexemeItem,
  PhraseItem,
  Quantity,
  TextSpan,
} from "../ast/types.js";
import type { LexiconEntryInput } from "../lexicon/types.js";
import { normalizeText } from "../normalize/normalize-text.js";
import { NOISE_VALUE_KEY } from "../ontology/vocabulary.js";

export type MentionStatus = "AUTO_RESOLVED" | "NEEDS_REVIEW" | "UNRESOLVED";

/**
 * One mention: a segment, or one half of a split coordination ("salt and pepper").
 *
 * @example
 * // "1 lb boneless chicken thighs"
 * { segmentIndex: 0, partIndex: 0, status: "AUTO_RESOLVED", resolution: { candidates: [{ conceptId: "<chicken thigh>", attributes: [bone=boneless], ... }], ... } }
 */
export interface SegmentResolution {
  segmentIndex: number;
  /** 0 unless a coordination split this segment into several mentions. */
  partIndex: number;
  span: TextSpan;
  status: MentionStatus;
  resolution: Resolution;
}

type Zone = "measurement" | "main" | "trailing" | "paren";

interface ZonedItem {
  item: PhraseItem;
  zone: Zone;
  /** Position within the main phrase; -1 outside it. */
  mainIndex: number;
}

/** Words that join or introduce phrases; they are neither explained nor unknown. */
export const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "the",
  "of",
  "with",
  "for",
  "in",
  "on",
  "into",
  "and",
  "or",
  "&",
  "any",
  "your",
]);

/** Package units that imply a canned product ("1 can tomatoes" -> canned tomatoes). */
const CANNED_UNITS = new Set(["can", "tin"]);

const COORDINATION_SPLIT = new Set(["and", "&"]);

function entriesOf(
  item: LexemeItem,
  context: ResolverContext
): LexiconEntryInput[] {
  return item.entryIds.flatMap((id) => {
    const entry = context.entries.get(id);
    return entry ? [entry] : [];
  });
}

function foodConceptIds(item: PhraseItem, context: ResolverContext): string[] {
  if (item.kind !== "LEXEME") return [];
  const ids = entriesOf(item, context)
    .filter((entry) => entry.role === "FOOD" && entry.conceptId)
    .map((entry) => entry.conceptId as string);
  return [...new Set(ids)];
}

function tokenCount(text: string): number {
  return text
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean).length;
}

function isFunctionWord(item: PhraseItem): boolean {
  return (
    item.kind === "UNKNOWN" && FUNCTION_WORDS.has(item.span.text.toLowerCase())
  );
}

/** Merges adjacent unknown items (separated only by spaces or hyphens) into spans of the raw line. */
function mergeSpans(spans: TextSpan[], raw: string): TextSpan[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const merged: TextSpan[] = [];
  for (const span of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && /^[\s-]*$/.test(raw.slice(previous.end, span.start))) {
      merged[merged.length - 1] = {
        start: previous.start,
        end: span.end,
        text: raw.slice(previous.start, span.end),
      };
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

function packageUnit(quantity: Quantity | undefined): string | undefined {
  if (!quantity) return undefined;
  switch (quantity.kind) {
    case "PACKAGE":
      return quantity.packageType?.id;
    case "EXACT":
    case "RANGE":
      return quantity.unit?.id;
    case "APPROXIMATE":
      return packageUnit(quantity.quantity);
    case "ALTERNATIVE":
      return quantity.options
        .map(packageUnit)
        .find((unit) => unit !== undefined);
    default:
      return undefined;
  }
}

/** A canned descendant of the head ("tomato" -> "canned tomatoes") when the line is measured in cans. */
function cannedVariant(
  conceptId: string,
  segment: IngredientSegmentSyntax,
  context: ResolverContext
): string | undefined {
  const unit = packageUnit(segment.quantity);
  if (!unit || !CANNED_UNITS.has(unit)) return undefined;
  const isCanned = (id: string) =>
    [...context.ontology.conceptAttributes(id)].some((valueId) => {
      const value = context.attributeValues.get(valueId);
      return value?.definitionKey === "preservation" && value.key === "canned";
    });
  if (isCanned(conceptId)) return undefined;
  const variants = context.ontology
    .descendants(conceptId, ["IS_A", "PROCESSED_FROM", "DERIVED_FROM"])
    .filter(isCanned);
  return variants.length === 1 ? variants[0] : undefined;
}

interface PartInput {
  segment: IngredientSegmentSyntax;
  line: IngredientLineSyntax;
  segmentIndex: number;
  partIndex: number;
  span: TextSpan;
  main: PhraseItem[];
  shared: ZonedItem[];
  extraReasons: string[];
}

interface CandidateWork {
  candidate: ResolutionCandidate;
  blocksAuto: boolean;
  mainUnknownTokens: number;
}

type NonHeadRole =
  | "ATTRIBUTE"
  | "PREPARATION"
  | "DEGREE"
  | "MEASUREMENT_MODIFIER"
  | "INSTRUCTION"
  | "FOOD";

function chooseRole(
  entries: LexiconEntryInput[],
  applicable: ReadonlySet<string>,
  context: ResolverContext,
  zone: Zone
): NonHeadRole | null {
  const has = (role: LexiconEntryInput["role"]) =>
    entries.some((entry) => entry.role === role);
  const attributeEntries = entries.filter(
    (entry) => entry.role === "ATTRIBUTE" && entry.attributeValueId
  );
  const applicableAttribute = attributeEntries.some((entry) => {
    const value = context.attributeValues.get(entry.attributeValueId as string);
    return value !== undefined && applicable.has(value.definitionId);
  });
  if (zone === "measurement" && has("MEASUREMENT_MODIFIER"))
    return "MEASUREMENT_MODIFIER";
  if (applicableAttribute) return "ATTRIBUTE";
  if (has("PREPARATION")) return "PREPARATION";
  if (has("DEGREE")) return "DEGREE";
  if (has("MEASUREMENT_MODIFIER")) return "MEASUREMENT_MODIFIER";
  if (has("INSTRUCTION")) return "INSTRUCTION";
  if (attributeEntries.length > 0) return "ATTRIBUTE";
  if (has("FOOD")) return "FOOD";
  return null;
}

function buildCandidate(
  input: PartInput,
  headIndex: number,
  originalConceptId: string,
  headEntryId: string | null,
  context: ResolverContext
): CandidateWork {
  const { segment, line, main, shared } = input;
  const head = main[headIndex] as LexemeItem;
  const reasons: string[] = [];

  const canned = cannedVariant(originalConceptId, segment, context);
  const conceptId = canned ?? originalConceptId;
  const conceptName =
    context.ontology.concept(conceptId)?.canonicalName ?? conceptId;
  const headTokens = tokenCount(head.span.text);
  reasons.push(
    `head:${context.ontology.concept(originalConceptId)?.canonicalName ?? originalConceptId}(${headTokens} token${headTokens === 1 ? "" : "s"})`
  );
  const headEntry = headEntryId ? context.entries.get(headEntryId) : undefined;
  if (headEntry?.kind && headEntry.kind !== "CANONICAL")
    reasons.push(`entry:${headEntry.kind}`);
  if (canned)
    reasons.push(`package:${packageUnit(segment.quantity)}->${conceptName}`);

  const applicable = context.ontology.applicableDefinitions(conceptId);
  const attributes = new Map<string, ResolvedAttribute>();
  const preparations: ResolvedPreparation[] = [];
  const modifiers: ResolvedModifier[] = [];
  const mainUnknown: TextSpan[] = [];
  const notes: TextSpan[] = [];
  let explained = 1;
  let unexplained = 0;
  let ambiguousLexemes = 0;
  let blocksAuto = false;

  const items: ZonedItem[] = [
    ...shared.filter((zoned) => zoned.zone === "measurement"),
    ...main.map((item, mainIndex) => ({
      item,
      zone: "main" as const,
      mainIndex,
    })),
    ...shared.filter((zoned) => zoned.zone !== "measurement"),
  ];

  let pendingDegree: {
    entry: LexiconEntryInput;
    span: TextSpan;
    zone: Zone;
  } | null = null;
  const resolvePendingDegree = (asUnexplained: boolean) => {
    if (!pendingDegree) return;
    if (asUnexplained) {
      reasons.push(`dangling_degree:${pendingDegree.span.text}`);
      (pendingDegree.zone === "main" ? mainUnknown : notes).push(
        pendingDegree.span
      );
      if (pendingDegree.zone === "main") unexplained += 1;
    }
    pendingDegree = null;
  };

  for (const zoned of items) {
    const { item, zone, mainIndex } = zoned;
    if (zone === "main" && mainIndex === headIndex) {
      resolvePendingDegree(true);
      continue;
    }
    if (item.kind === "PUNCT") continue;
    if (pendingDegree && pendingDegree.zone !== zone)
      resolvePendingDegree(true);

    if (item.kind === "UNKNOWN") {
      resolvePendingDegree(true);
      if (isFunctionWord(item)) continue;
      if (zone === "main") {
        mainUnknown.push(item.span);
        unexplained += 1;
      } else {
        notes.push(item.span);
      }
      continue;
    }

    const entries = entriesOf(item, context);
    const role = chooseRole(entries, applicable, context, zone);
    const isPreHead = zone === "main" && mainIndex < headIndex;

    if (role === "DEGREE") {
      resolvePendingDegree(true);
      const entry = entries.find((candidate) => candidate.role === "DEGREE");
      if (entry) pendingDegree = { entry, span: item.span, zone };
      if (zone === "main") explained += 1;
      continue;
    }

    if (role === "PREPARATION") {
      const preparationIds = [
        ...new Set(
          entries
            .filter(
              (entry) => entry.role === "PREPARATION" && entry.preparationId
            )
            .map((entry) => entry.preparationId as string)
        ),
      ];
      if (preparationIds.length > 1) {
        ambiguousLexemes += 1;
        blocksAuto = true;
        reasons.push(`ambiguous_preparation:${item.span.text}`);
      }
      const degree = pendingDegree as {
        entry: LexiconEntryInput;
        span: TextSpan;
      } | null;
      for (const preparationId of preparationIds) {
        preparations.push({
          preparationId,
          degreeKey: degree?.entry.valueKey ?? null,
          position: isPreHead ? "PRE_HEAD" : "POST_HEAD",
          span: degree
            ? {
                start: degree.span.start,
                end: item.span.end,
                text: line.raw.slice(degree.span.start, item.span.end),
              }
            : item.span,
        });
      }
      pendingDegree = null;
      if (zone === "main") explained += 1;
      continue;
    }

    if (role === "MEASUREMENT_MODIFIER" || role === "INSTRUCTION") {
      const entry = entries.find(
        (candidate) => candidate.role === role && candidate.valueKey
      );
      const degree =
        role === "MEASUREMENT_MODIFIER"
          ? (pendingDegree as {
              entry: LexiconEntryInput;
              span: TextSpan;
            } | null)
          : null;
      if (entry?.valueKey && entry.valueKey !== NOISE_VALUE_KEY) {
        modifiers.push({
          role,
          valueKey: entry.valueKey,
          span: degree
            ? {
                start: degree.span.start,
                end: item.span.end,
                text: line.raw.slice(degree.span.start, item.span.end),
              }
            : item.span,
        });
        if (degree)
          reasons.push(`degree:${degree.span.text}->${entry.valueKey}`);
      }
      if (degree) pendingDegree = null;
      else resolvePendingDegree(true);
      if (zone === "main") explained += 1;
      continue;
    }

    resolvePendingDegree(true);

    if (role === "ATTRIBUTE") {
      const values = entries
        .filter((entry) => entry.role === "ATTRIBUTE" && entry.attributeValueId)
        .map((entry) => ({
          entry,
          value: context.attributeValues.get(entry.attributeValueId as string),
        }))
        .filter(
          (
            pair
          ): pair is {
            entry: LexiconEntryInput;
            value: NonNullable<typeof pair.value>;
          } => pair.value !== undefined
        );
      const fitting = values.filter((pair) =>
        applicable.has(pair.value.definitionId)
      );
      const kept = fitting.length > 0 ? fitting : values;
      if (fitting.length === 0) {
        reasons.push(`attribute_not_applicable:${item.span.text}`);
        blocksAuto = true;
      } else if (kept.length > 1) {
        reasons.push(`ambiguous_attribute:${item.span.text}`);
        ambiguousLexemes += 1;
        blocksAuto = true;
      }
      for (const { entry, value } of kept) {
        if (!attributes.has(value.id)) {
          attributes.set(value.id, {
            attributeValueId: value.id,
            lexiconEntryId: entry.id,
            source: "ASSERTED",
            span: item.span,
          });
        }
      }
      if (zone === "main") explained += 1;
      continue;
    }

    if (role === "FOOD" && zone === "main") {
      reasons.push(`extra_food:${item.span.text}`);
      mainUnknown.push(item.span);
      unexplained += 1;
      blocksAuto = true;
      continue;
    }

    (zone === "main" ? mainUnknown : notes).push(item.span);
    if (zone === "main") unexplained += 1;
  }
  resolvePendingDegree(true);

  const mergedUnknown = mergeSpans(mainUnknown, line.raw);
  for (const span of mergedUnknown) reasons.push(`unknown:"${span.text}"`);
  const priorKey = normalizeText(head.span.text).text.toLowerCase();
  const priorShare = context.priorVerifiedShare[priorKey]?.[conceptId] ?? 0;
  if (priorShare > 0) reasons.push(`prior:${priorShare.toFixed(2)}`);
  reasons.push(...input.extraReasons);

  const score = scoreCandidate(
    {
      headTokens,
      explainedRatio: explained / (explained + unexplained),
      unknownTokens: mainUnknown.length,
      ambiguousLexemes,
      priorShare,
    },
    context.config
  );

  return {
    candidate: {
      conceptId,
      entryId: headEntryId,
      score,
      reasons,
      attributes: [...attributes.values()],
      preparations,
      modifiers,
      unresolved: [...mergedUnknown, ...mergeSpans(notes, line.raw)],
    },
    blocksAuto,
    mainUnknownTokens: mainUnknown.length,
  };
}

function headIndexOf(main: PhraseItem[], context: ResolverContext): number {
  for (let index = main.length - 1; index >= 0; index--) {
    const item = main[index];
    if (item && foodConceptIds(item, context).length > 0) return index;
  }
  return -1;
}

function candidatesForPart(
  input: PartInput,
  context: ResolverContext
): { works: CandidateWork[]; headAmbiguous: boolean } {
  const headIndex = headIndexOf(input.main, context);
  if (headIndex < 0) return { works: [], headAmbiguous: false };
  const head = input.main[headIndex] as LexemeItem;
  const foodEntries = entriesOf(head, context).filter(
    (entry) => entry.role === "FOOD" && entry.conceptId
  );
  const byConcept = new Map<string, string>();
  for (const entry of foodEntries)
    if (!byConcept.has(entry.conceptId as string))
      byConcept.set(entry.conceptId as string, entry.id);

  const works = [...byConcept].map(([conceptId, entryId]) =>
    buildCandidate(input, headIndex, conceptId, entryId, context)
  );
  if (works.length > 1) {
    for (const work of works) {
      work.candidate.reasons.push(`ambiguous_food:${head.span.text}`);
      work.candidate.score = Math.max(
        0,
        Math.round((work.candidate.score - context.config.ambiguity) * 1000) /
          1000
      );
    }
  }
  return { works, headAmbiguous: works.length > 1 };
}

function unresolvedHead(input: PartInput): TextSpan[] {
  const spans = input.main
    .filter((item) => item.kind === "UNKNOWN" && !isFunctionWord(item))
    .map((item) => item.span);
  return mergeSpans(spans, input.line.raw);
}

function finish(
  input: PartInput,
  works: CandidateWork[],
  forceReview: boolean,
  context: ResolverContext
): SegmentResolution {
  const ranked = [...works].sort(
    (a, b) => b.candidate.score - a.candidate.score
  );
  const best = ranked[0];
  let status: MentionStatus;
  if (!best) {
    status = "UNRESOLVED";
  } else {
    const second = ranked[1];
    const clearLead =
      !second ||
      best.candidate.score - second.candidate.score >= context.config.minMargin;
    const single = ranked.length === 1;
    status =
      single &&
      clearLead &&
      !forceReview &&
      !best.blocksAuto &&
      best.mainUnknownTokens <= context.config.maxUnknownForAuto
        ? "AUTO_RESOLVED"
        : "NEEDS_REVIEW";
  }

  const unresolved = best ? best.candidate.unresolved : unresolvedHead(input);
  return {
    segmentIndex: input.segmentIndex,
    partIndex: input.partIndex,
    span: input.span,
    status,
    resolution: {
      resolverVersion: RESOLVER_VERSION,
      candidates: ranked.map((work) => work.candidate),
      unresolved,
    },
  };
}

function sharedItems(segment: IngredientSegmentSyntax): ZonedItem[] {
  return [
    ...segment.measurementModifiers.map((item) => ({
      item,
      zone: "measurement" as const,
      mainIndex: -1,
    })),
    ...(segment.trailing?.phrase ?? []).map((item) => ({
      item,
      zone: "trailing" as const,
      mainIndex: -1,
    })),
    ...segment.parentheticals.flatMap((parenthetical) =>
      parenthetical.phrase.map((item) => ({
        item,
        zone: "paren" as const,
        mainIndex: -1,
      }))
    ),
  ];
}

function spanBetween(raw: string, start: number, end: number): TextSpan {
  const text = raw.slice(start, end);
  const leading = text.length - text.trimStart().length;
  const trailing = text.length - text.trimEnd().length;
  return { start: start + leading, end: end - trailing, text: text.trim() };
}

/**
 * Resolves one segment into mentions (decision steps 1-7 of the Phase 3 plan): pick the head FOOD lexeme, attach attributes, preparations, and modifiers, choose among attribute meanings using the ontology, handle coordination, then score and assign a status.
 *
 * @example
 * resolveSegment(line.segments[0], line, 0, context)
 * // [{ status: "AUTO_RESOLVED", resolution: { candidates: [{ conceptId: "<parsley>", preparations: [{ preparationId: "<chop>", degreeKey: "fine", position: "PRE_HEAD" }] }] } }]
 */
export function resolveSegment(
  segment: IngredientSegmentSyntax,
  line: IngredientLineSyntax,
  segmentIndex: number,
  context: ResolverContext
): SegmentResolution[] {
  const shared = sharedItems(segment);
  const base: PartInput = {
    segment,
    line,
    segmentIndex,
    partIndex: 0,
    span: segment.span,
    main: segment.phrase,
    shared,
    extraReasons: [],
  };

  const coordination = segment.coordination;
  if (coordination && !coordination.confirmed) {
    const conjunctionIndex = segment.phrase.findIndex(
      (item) =>
        item.span.start === coordination.conjunction.start &&
        item.span.end === coordination.conjunction.end
    );
    const left = segment.phrase.slice(0, Math.max(0, conjunctionIndex));
    const right = segment.phrase.slice(conjunctionIndex + 1);
    if (
      conjunctionIndex > 0 &&
      headIndexOf(left, context) >= 0 &&
      headIndexOf(right, context) >= 0
    ) {
      const conjunction = coordination.conjunction.text.toLowerCase();
      const leftInput: PartInput = { ...base, main: left };
      const rightInput: PartInput = { ...base, main: right };

      if (COORDINATION_SPLIT.has(conjunction)) {
        const leftSpan = spanBetween(
          line.raw,
          segment.span.start,
          coordination.conjunction.start
        );
        const rightSpan = spanBetween(
          line.raw,
          coordination.conjunction.end,
          segment.span.end
        );
        return [
          {
            ...leftInput,
            span: leftSpan,
            extraReasons: ["split_coordination"],
          },
          {
            ...rightInput,
            partIndex: 1,
            span: rightSpan,
            extraReasons: ["split_coordination"],
          },
        ].map((part) => {
          const { works, headAmbiguous } = candidatesForPart(part, context);
          return finish(part, works, headAmbiguous, context);
        });
      }

      const alternatives = [
        candidatesForPart(leftInput, context),
        candidatesForPart(rightInput, context),
      ];
      const works = alternatives.flatMap((alternative) => alternative.works);
      for (const work of works)
        work.candidate.reasons.push(`alternative:${conjunction}`);
      return [finish(base, works, true, context)];
    }
  }

  const { works, headAmbiguous } = candidatesForPart(base, context);
  return [finish(base, works, headAmbiguous, context)];
}

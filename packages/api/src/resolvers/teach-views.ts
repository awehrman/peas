import {
  type DiscoveryQueueItem,
  type MentionDetailRecord,
  getConceptRefs,
  getCurrentRevision,
  getLexiconEntryRefs,
  loadResolverSnapshot,
} from "@peas/database";
import {
  type DecisionPayload,
  type DiscoveryPayload,
  type IngredientSegmentSyntax,
  type PhraseItem,
  type Resolution,
  type ResolutionSummary,
  type ResolverContext,
  type SegmentResolution,
  type TextSpan,
  buildResolverContext,
  describeQuantity,
  summarizeResolution,
} from "@peas/parser/v2";

import type {
  ConceptRef,
  Discovery,
  IngredientLine,
  LexiconEntryRef,
  MentionStatus,
  ResolutionCandidateView,
  ResolutionView,
  SyntaxToken,
} from "../generated/resolvers-types.js";

/** Discovery as resolvers return it; `examples` has its own field resolver. */
export type DiscoveryParent = Omit<Discovery, "examples" | "fixtureBlock">;

/** Ingredient lines as the note and recipe repositories return them; `mentions` has its own field resolver. */
export type IngredientLineParent = Omit<IngredientLine, "mentions">;

let cachedContext: { revision: number; context: ResolverContext } | null = null;

/**
 * The resolver context for the current lexicon revision, rebuilt only when the revision changes. Verified-choice priors refresh with the next revision.
 *
 * @example
 * processIngredientLine(line, await currentResolverContext())
 */
export async function currentResolverContext(): Promise<ResolverContext> {
  const revision = await getCurrentRevision();
  if (cachedContext?.revision === revision) return cachedContext.context;
  const context = buildResolverContext(await loadResolverSnapshot());
  cachedContext = { revision: context.revision, context };
  return context;
}

function conceptIdsOf(payload: DiscoveryPayload): string[] {
  switch (payload.type) {
    case "UNKNOWN_FOOD_PHRASE":
      return payload.suggestedHeadConceptIds ?? [];
    case "UNKNOWN_MODIFIER":
      return (payload.adjacentHeads ?? []).map((head) => head.conceptId);
    case "ATTRIBUTE_INTERPRETATION":
      return payload.headConceptId ? [payload.headConceptId] : [];
    case "IDENTITY_DECISION":
      return [payload.headConceptId];
    case "RELATIONSHIP_SUGGESTION":
      return [payload.sourceConceptId, payload.targetConceptId];
    case "VERIFIED_DRIFT":
      return [payload.verifiedConceptId, payload.proposedConceptId].filter(
        (id): id is string => id !== null
      );
    case "AMBIGUOUS_MATCH":
    case "STRUCTURAL_PATTERN":
      return [];
  }
}

function entryIdsOf(payload: DiscoveryPayload): string[] {
  switch (payload.type) {
    case "ATTRIBUTE_INTERPRETATION":
    case "AMBIGUOUS_MATCH":
      return payload.entryIds;
    case "IDENTITY_DECISION":
      return payload.modifierEntryIds;
    default:
      return [];
  }
}

function titleOf(
  payload: DiscoveryPayload,
  name: (id: string | null | undefined) => string
): string {
  switch (payload.type) {
    case "UNKNOWN_FOOD_PHRASE":
    case "IDENTITY_DECISION":
    case "AMBIGUOUS_MATCH":
      return payload.phrase;
    case "UNKNOWN_MODIFIER":
      return payload.token;
    case "ATTRIBUTE_INTERPRETATION":
      return payload.headConceptId
        ? `${payload.phrase} with ${name(payload.headConceptId)}`
        : payload.phrase;
    case "RELATIONSHIP_SUGGESTION":
      return `${name(payload.sourceConceptId)} ${payload.relationshipType} ${name(payload.targetConceptId)}`;
    case "STRUCTURAL_PATTERN":
      return payload.signature;
    case "VERIFIED_DRIFT":
      return `verified ${name(payload.verifiedConceptId)}, now reads ${name(payload.proposedConceptId)}`;
  }
}

/**
 * Discovery rows with their payload ids resolved to concept and entry labels, in two queries for the whole page.
 *
 * @example
 * await describeDiscoveries(queue.items) // [{ title: "green with tomato", concepts: [{ canonicalName: "tomato" }], entries: [{ targetLabel: "color: green" }, ...] }]
 */
export async function describeDiscoveries(
  items: readonly DiscoveryQueueItem[]
): Promise<DiscoveryParent[]> {
  const [concepts, entries] = await Promise.all([
    getConceptRefs(items.flatMap((item) => conceptIdsOf(item.payload))),
    getLexiconEntryRefs(items.flatMap((item) => entryIdsOf(item.payload))),
  ]);
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const name = (id: string | null | undefined) =>
    id ? (conceptById.get(id)?.canonicalName ?? "unknown concept") : "nothing";

  return items.map((item) => ({
    id: item.id,
    type: item.type,
    key: item.key,
    status: item.status,
    priority: item.priority,
    mentionCount: item.mentionCount,
    distinctNoteCount: item.distinctNoteCount,
    payload: item.payload,
    title: titleOf(item.payload, name),
    concepts: conceptIdsOf(item.payload).flatMap((id) => {
      const concept = conceptById.get(id);
      return concept ? [concept] : [];
    }),
    entries: entryIdsOf(item.payload).flatMap((id): LexiconEntryRef[] => {
      const entry = entryById.get(id);
      return entry
        ? [
            {
              id: entry.id,
              text: entry.text,
              role: entry.role,
              targetLabel: entry.targetLabel,
              conceptId: entry.conceptId,
              attributeValueId: entry.attributeValueId,
            },
          ]
        : [];
    }),
  }));
}

/** Every word of a segment (or of one coordination part) with its role and zone, for highlighting. */
export function syntaxTokens(
  segment: IngredientSegmentSyntax,
  within?: TextSpan
): SyntaxToken[] {
  const inside = (item: PhraseItem) =>
    !within || (item.span.start >= within.start && item.span.end <= within.end);
  const zoned: [string, PhraseItem[]][] = [
    ["MEASUREMENT", segment.measurementModifiers],
    ["MAIN", segment.phrase],
    [
      "PAREN",
      segment.parentheticals.flatMap((parenthetical) => parenthetical.phrase),
    ],
    ["TRAILING", segment.trailing?.phrase ?? []],
  ];
  return zoned
    .flatMap(([zone, items]) =>
      items.filter(inside).map((item) => ({
        span: item.span,
        kind: item.kind,
        roles: item.kind === "LEXEME" ? [...item.roles] : [],
        zone,
      }))
    )
    .sort((a, b) => a.span.start - b.span.start);
}

export function candidateViews(
  resolution: Resolution,
  context: ResolverContext
): ResolutionCandidateView[] {
  return resolution.candidates.map((candidate) => {
    const summary = summarizeResolution(
      {
        segmentIndex: 0,
        partIndex: 0,
        span: { start: 0, end: 0, text: "" },
        status: "AUTO_RESOLVED",
        resolution: { ...resolution, candidates: [candidate] },
      },
      context
    );
    return {
      conceptId: candidate.conceptId,
      conceptName: summary.conceptName ?? candidate.conceptId,
      score: candidate.score,
      reasons: candidate.reasons,
      attributes: summary.attributes,
      preparations: summary.preparations,
      modifiers: candidate.modifiers.map(
        (modifier) => `${modifier.role}:${modifier.valueKey}`
      ),
    };
  });
}

export function resolutionView(
  summary: ResolutionSummary,
  status: MentionStatus = summary.status
): ResolutionView {
  return { ...summary, status };
}

/**
 * The view of a stored mention. A verified mention shows the person's choice (concept and attributes) rather than the resolver's top candidate.
 */
export function mentionView(
  detail: MentionDetailRecord,
  context: ResolverContext
) {
  const segment = detail.syntax.segment;
  const span = {
    start: detail.spanStart,
    end: detail.spanEnd,
    text: detail.rawText,
  };
  const segmentResolution: SegmentResolution = {
    segmentIndex: detail.segmentIndex,
    partIndex: detail.partIndex,
    span,
    status:
      detail.resolutionStatus === "VERIFIED"
        ? "AUTO_RESOLVED"
        : detail.resolutionStatus,
    resolution: detail.resolution,
  };
  const summary = summarizeResolution(segmentResolution, context);
  const verified = detail.resolutionStatus === "VERIFIED";
  const verifiedAttributes = detail.attributes
    .map((attribute) => `${attribute.definitionKey}:${attribute.valueKey}`)
    .sort();
  const shown: ResolutionView = verified
    ? {
        ...summary,
        status: "VERIFIED",
        conceptId: detail.conceptId,
        conceptName: detail.conceptName,
        attributes: verifiedAttributes,
        text: `${detail.conceptName ?? "no concept"}${verifiedAttributes.length ? ` (${verifiedAttributes.map((key) => key.replace(":", ": ")).join(", ")})` : ""}`,
      }
    : resolutionView(summary, detail.resolutionStatus);
  const concept: ConceptRef | null =
    detail.conceptId && detail.conceptName
      ? {
          id: detail.conceptId,
          canonicalName: detail.conceptName,
          status:
            context.ontology.concept(detail.conceptId)?.status ?? "VERIFIED",
        }
      : null;

  return {
    id: detail.id,
    segmentIndex: detail.segmentIndex,
    partIndex: detail.partIndex,
    span,
    rawText: detail.rawText,
    status: detail.resolutionStatus,
    concept,
    score: detail.score,
    quantity: detail.quantity ? describeQuantity(detail.quantity) : null,
    verified: detail.verifiedAt !== null,
    lexiconRevision: detail.lexiconRevision,
    summary: shown,
    tokens: segment.coordination
      ? syntaxTokens(segment, span)
      : syntaxTokens(segment),
    candidates: candidateViews(detail.resolution, context),
    unresolved: detail.resolution.unresolved,
  };
}

/**
 * The confirmation for a taught decision, e.g. "Taught: icing sugar is powdered sugar".
 */
export async function describeDecision(
  payload: DecisionPayload
): Promise<string> {
  const ids = [
    "conceptId" in payload ? payload.conceptId : null,
    "survivorId" in payload ? payload.survivorId : null,
    "mergedId" in payload ? payload.mergedId : null,
    "sourceConceptId" in payload ? payload.sourceConceptId : null,
    "targetConceptId" in payload ? payload.targetConceptId : null,
  ].filter((id): id is string => typeof id === "string");
  const names = new Map(
    (await getConceptRefs(ids)).map((concept) => [
      concept.id,
      concept.canonicalName,
    ])
  );
  const name = (id: string | null | undefined) =>
    id ? (names.get(id) ?? "a concept") : "nothing";

  switch (payload.type) {
    case "MAP_TO_CONCEPT":
      return `Taught: ${payload.phrase} is ${name(payload.conceptId)}`;
    case "CREATE_CONCEPT":
      return `Taught: new concept ${payload.canonicalName}`;
    case "CONCEPT_PLUS_ATTRIBUTE":
      return `Taught: ${payload.phrase} is ${name(payload.conceptId)} with an attribute`;
    case "CLASSIFY_MODIFIER":
      return `Taught: ${payload.token} is a ${payload.role.toLowerCase().replace(/_/g, " ")}`;
    case "ADD_ATTRIBUTE_VALUE":
      return `Taught: new attribute value ${payload.label}`;
    case "ADD_RELATIONSHIP":
      return `Taught: ${name(payload.sourceConceptId)} ${payload.relationshipType} ${name(payload.targetConceptId)}`;
    case "MARK_AMBIGUOUS":
      return `Taught: ${payload.phrase} stays ambiguous`;
    case "IGNORE_TOKEN":
      return `Taught: ignore ${payload.token}`;
    case "REJECT":
      return "Rejected";
    case "MERGE_CONCEPTS":
      return `Taught: merged ${name(payload.mergedId)} into ${name(payload.survivorId)}`;
    case "CORRECT_MENTION":
      return `Corrected to ${name(payload.conceptId)}`;
    case "APPROVE_CONCEPT":
      return `Approved ${name(payload.conceptId)}`;
    case "EDIT_CONCEPT":
      return `Updated ${payload.canonicalName ?? name(payload.conceptId)}`;
    case "EDIT_ENTRY":
      return payload.status === "DEPRECATED"
        ? `Retired “${payload.text}”`
        : `Updated “${payload.text}”`;
    case "REVERT":
      return "Reverted the decision";
  }
}

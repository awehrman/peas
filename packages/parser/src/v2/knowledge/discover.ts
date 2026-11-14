import type { DiscoveryPayload } from "./schemas.js";

import type {
  IngredientSegmentSyntax,
  LexemeItem,
  LexiconRole,
  PhraseItem,
  TextSpan,
} from "../ast/types.js";
import { entryMatchKey, entryTokenKeys } from "../lexicon/token-trie.js";
import { normalizeText } from "../normalize/normalize-text.js";
import type { ResolverContext } from "../resolve/context.js";
import type { IngredientLineResult } from "../resolve/process-line.js";
import {
  FUNCTION_WORDS,
  type SegmentResolution,
} from "../resolve/resolve-segment.js";
import type { ResolutionCandidate } from "../resolve/schemas.js";

import { structuralIssue } from "./structure-signature.js";

/**
 * Something one line suggests a reviewer should look at. The backfill groups these by `(payload.type, key)` across lines and stores the span as evidence on the mention for `segmentIndex`.
 *
 * @example
 * // "3 tablespoons calamansi juice"
 * { key: "calamansi juice", segmentIndex: 0, span: { start: 14, end: 29, text: "calamansi juice" },
 *   payload: { type: "UNKNOWN_FOOD_PHRASE", phrase: "calamansi juice", headToken: "juice", neighbors: [], suggestedHeadConceptIds: [] } }
 */
export interface LineDiscovery {
  key: string;
  payload: DiscoveryPayload;
  segmentIndex: number;
  span: TextSpan;
}

export interface DiscoveryConfig {
  /** IDENTITY_DECISION discoveries enter the review queue once this many distinct notes support them. */
  identityMinNotes: number;
}

export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  identityMinNotes: 2,
};

type Zone = "measurement" | "main" | "trailing" | "paren";
type ModifierRole = Exclude<LexiconRole, "FOOD">;

const foodIndexCache = new WeakMap<ResolverContext, Map<string, string[]>>();

/** FOOD entry match key -> concept ids, including proposed entries (useful hints even when conservative parsing ignores them). */
function foodIndex(context: ResolverContext): Map<string, string[]> {
  const cached = foodIndexCache.get(context);
  if (cached) return cached;
  const index = new Map<string, string[]>();
  const add = (key: string, conceptId: string) => {
    const ids = index.get(key) ?? [];
    if (!ids.includes(conceptId)) ids.push(conceptId);
    index.set(key, ids);
  };
  for (const entry of context.entries.values()) {
    if (entry.role === "FOOD" && entry.conceptId)
      add(entryMatchKey(entry.text), entry.conceptId);
  }
  foodIndexCache.set(context, index);
  return index;
}

function keyOf(text: string): string {
  return normalizeText(text).text.toLowerCase().trim();
}

function isWord(item: PhraseItem): boolean {
  return item.kind !== "PUNCT";
}

function isFunctionWord(item: PhraseItem | undefined): boolean {
  return (
    item?.kind === "UNKNOWN" && FUNCTION_WORDS.has(item.span.text.toLowerCase())
  );
}

function within(span: TextSpan, outer: TextSpan): boolean {
  return span.start >= outer.start && span.end <= outer.end;
}

function lexemeRoles(item: PhraseItem | undefined): readonly LexiconRole[] {
  return item?.kind === "LEXEME" ? item.roles : [];
}

/** The items of each zone that belong to this mention (a coordination part covers only part of the segment). */
function zonesOf(
  segment: IngredientSegmentSyntax,
  mention: SegmentResolution
): Record<Zone, PhraseItem[]> {
  const inMention = (item: PhraseItem) => within(item.span, mention.span);
  return {
    measurement: segment.measurementModifiers.filter(inMention),
    main: segment.phrase.filter(inMention),
    trailing: (segment.trailing?.phrase ?? []).filter(inMention),
    paren: segment.parentheticals.flatMap((parenthetical) =>
      parenthetical.phrase.filter(inMention)
    ),
  };
}

function headIndexOf(
  main: PhraseItem[],
  candidate: ResolutionCandidate
): number {
  for (let index = main.length - 1; index >= 0; index -= 1) {
    const item = main[index];
    if (
      item?.kind === "LEXEME" &&
      candidate.entryId &&
      item.entryIds.includes(candidate.entryId)
    )
      return index;
  }
  return -1;
}

function suggestRoles(
  token: string,
  zone: Zone,
  isPreHead: boolean,
  next: PhraseItem | undefined
): ModifierRole[] {
  const lower = token.toLowerCase();
  const nextRoles = lexemeRoles(next);
  if (zone === "measurement") return ["MEASUREMENT_MODIFIER"];
  if (
    lower.endsWith("ly") &&
    (nextRoles.includes("PREPARATION") ||
      nextRoles.includes("MEASUREMENT_MODIFIER"))
  )
    return ["DEGREE"];
  if (zone === "paren") return ["INSTRUCTION", "ATTRIBUTE"];
  if (zone === "trailing") return ["PREPARATION", "INSTRUCTION"];
  if (lower.endsWith("ed"))
    return isPreHead ? ["PREPARATION", "ATTRIBUTE"] : ["PREPARATION"];
  return isPreHead ? ["ATTRIBUTE"] : ["PREPARATION", "INSTRUCTION"];
}

/**
 * Discoveries suggested by one processed line (Phase 4b):
 *
 * - UNKNOWN_FOOD_PHRASE: no FOOD head; the key is the unknown run in head position ("calamansi juice"), with FOOD entries for words inside it as DERIVED_FROM hints.
 * - UNKNOWN_MODIFIER: an unknown word next to a known lexeme ("loosely" before "packed"), with roles suggested by position and spelling.
 * - ATTRIBUTE_INTERPRETATION: an attribute with several or no applicable meanings for the head; key `${text}|${headConceptId}`.
 * - IDENTITY_DECISION: an attribute right before the head ("whole" + "milk") whose two-word phrase has no FOOD entry. The review queue only shows these once enough notes support them (`identityMinNotes`).
 * - AMBIGUOUS_MATCH: a head phrase that names several concepts ("pepper").
 *
 * Pure and deterministic; one line yields at most one discovery per type and key.
 *
 * @example
 * discover(processIngredientLine("2 cups organic milk", context), context)
 * // [{ key: "organic", payload: { type: "UNKNOWN_MODIFIER", token: "organic", position: "PRE_HEAD", neighbors: ["milk"], suggestedRoles: ["ATTRIBUTE"] }, ... }]
 */
export function discover(
  result: IngredientLineResult,
  context: ResolverContext
): LineDiscovery[] {
  const found = new Map<string, LineDiscovery>();
  const add = (discovery: LineDiscovery) => {
    const id = `${discovery.payload.type}|${discovery.key}`;
    if (!found.has(id)) found.set(id, discovery);
  };
  const raw = result.line.raw;

  for (const mention of result.mentions) {
    const segment = result.line.segments[mention.segmentIndex];
    if (!segment) continue;
    const zones = zonesOf(segment, mention);
    const top = mention.resolution.candidates[0];
    const segmentIndex = mention.segmentIndex;

    if (!top) {
      const unknownFood = unknownFoodPhrase(zones.main, raw, context);
      if (unknownFood) add({ ...unknownFood, segmentIndex });
      continue;
    }

    const headIndex = headIndexOf(zones.main, top);
    for (const zone of ["measurement", "main", "trailing", "paren"] as const) {
      for (const modifier of unknownModifiers(zones[zone], zone, headIndex))
        add({ ...modifier, segmentIndex });
    }

    for (const discovery of attributeInterpretations(zones.main, top, context))
      add({ ...discovery, segmentIndex });

    const identity = identityDecision(zones.main, headIndex, top, raw, context);
    if (identity) add({ ...identity, segmentIndex });

    const ambiguous = ambiguousMatch(zones.main, headIndex, mention, context);
    if (ambiguous) add({ ...ambiguous, segmentIndex });
  }

  const issue = structuralIssue(result.line);
  if (issue)
    add({
      key: issue.signature,
      segmentIndex: issue.segmentIndex,
      span: issue.span,
      payload: {
        type: "STRUCTURAL_PATTERN",
        signature: issue.signature,
        example: raw,
        reason: issue.reason,
        parserVersion: result.line.parserVersion,
      },
    });

  return [...found.values()];
}

type Found = Omit<LineDiscovery, "segmentIndex">;

function unknownFoodPhrase(
  main: PhraseItem[],
  raw: string,
  context: ResolverContext
): Found | null {
  if (main.length === 0) return null;
  let end = main.length - 1;
  while (end >= 0 && (main[end]?.kind === "PUNCT" || isFunctionWord(main[end])))
    end -= 1;
  let start = end;
  while (start - 1 >= 0 && main[start - 1]?.kind !== "LEXEME") start -= 1;
  while (
    start <= end &&
    (main[start]?.kind === "PUNCT" || isFunctionWord(main[start]))
  )
    start += 1;
  const first = main[start];
  const last = main[end];
  if (!first || !last || start > end || last.kind !== "UNKNOWN") return null;

  const span: TextSpan = {
    start: first.span.start,
    end: last.span.end,
    text: raw.slice(first.span.start, last.span.end),
  };
  const words = entryTokenKeys(span.text).filter((token) =>
    /[\p{L}\p{N}]/u.test(token)
  );
  const index = foodIndex(context);
  const suggested = [
    ...new Set(words.flatMap((word) => index.get(word) ?? [])),
  ];
  const neighbors = main
    .slice(0, start)
    .filter((item) => item.kind === "LEXEME")
    .map((item) => item.span.text);

  return {
    key: keyOf(span.text),
    span,
    payload: {
      type: "UNKNOWN_FOOD_PHRASE",
      phrase: span.text,
      headToken: words[words.length - 1] ?? null,
      neighbors,
      suggestedHeadConceptIds: suggested,
    },
  };
}

function unknownModifiers(
  items: PhraseItem[],
  zone: Zone,
  headIndex: number
): Found[] {
  const results: Found[] = [];
  const isRunMember = (item: PhraseItem | undefined) =>
    item?.kind === "UNKNOWN" && !isFunctionWord(item);

  let index = 0;
  while (index < items.length) {
    if (!isRunMember(items[index])) {
      index += 1;
      continue;
    }
    const start = index;
    while (isRunMember(items[index + 1])) index += 1;
    const end = index;
    index += 1;

    const previous = items.slice(0, start).reverse().find(isWord);
    const next = items.slice(end + 1).find(isWord);
    if (previous?.kind !== "LEXEME" && next?.kind !== "LEXEME") continue;

    const neighbors = [previous, next]
      .filter((item): item is PhraseItem => item?.kind === "LEXEME")
      .map((item) => item.span.text);

    for (let position = start; position <= end; position += 1) {
      const item = items[position] as PhraseItem;
      const isPreHead =
        zone === "main" && headIndex >= 0 && position < headIndex;
      const following = position === end ? next : items[position + 1];
      results.push({
        key: keyOf(item.span.text),
        span: item.span,
        payload: {
          type: "UNKNOWN_MODIFIER",
          token: item.span.text,
          position:
            zone === "measurement"
              ? "MEASUREMENT"
              : isPreHead
                ? "PRE_HEAD"
                : "POST_HEAD",
          neighbors,
          suggestedRoles: suggestRoles(
            item.span.text,
            zone,
            isPreHead,
            following
          ),
        },
      });
    }
  }
  return results;
}

function lexemeAt(main: PhraseItem[], span: TextSpan): LexemeItem | undefined {
  return main.find(
    (item): item is LexemeItem =>
      item.kind === "LEXEME" &&
      item.span.start === span.start &&
      item.span.end === span.end
  );
}

function attributeInterpretations(
  main: PhraseItem[],
  candidate: ResolutionCandidate,
  context: ResolverContext
): Found[] {
  const applicable = context.ontology.applicableDefinitions(
    candidate.conceptId
  );
  const results: Found[] = [];
  const seenSpans = new Set<string>();

  for (const attribute of candidate.attributes) {
    if (!attribute.span) continue;
    const spanKey = `${attribute.span.start}:${attribute.span.end}`;
    if (seenSpans.has(spanKey)) continue;
    seenSpans.add(spanKey);

    const lexeme = lexemeAt(main, attribute.span);
    if (!lexeme) continue;
    const attributeEntries = lexeme.entryIds.flatMap((id) => {
      const entry = context.entries.get(id);
      return entry?.role === "ATTRIBUTE" && entry.attributeValueId
        ? [entry]
        : [];
    });
    const fitting = attributeEntries.filter((entry) => {
      const value = context.attributeValues.get(
        entry.attributeValueId as string
      );
      return value !== undefined && applicable.has(value.definitionId);
    });
    if (attributeEntries.length === 0 || fitting.length === 1) continue;

    results.push({
      key: `${keyOf(attribute.span.text)}|${candidate.conceptId}`,
      span: attribute.span,
      payload: {
        type: "ATTRIBUTE_INTERPRETATION",
        phrase: attribute.span.text,
        entryIds: attributeEntries.map((entry) => entry.id),
        headConceptId: candidate.conceptId,
      },
    });
  }
  return results;
}

function identityDecision(
  main: PhraseItem[],
  headIndex: number,
  candidate: ResolutionCandidate,
  raw: string,
  context: ResolverContext
): Found | null {
  const head = main[headIndex];
  const previous = main[headIndex - 1];
  if (head?.kind !== "LEXEME" || previous?.kind !== "LEXEME") return null;

  const modifierEntryIds = [
    ...new Set(
      candidate.attributes
        .filter(
          (attribute) =>
            attribute.span?.start === previous.span.start &&
            attribute.span.end === previous.span.end &&
            attribute.lexiconEntryId
        )
        .map((attribute) => attribute.lexiconEntryId as string)
    ),
  ];
  if (modifierEntryIds.length === 0) return null;

  const span: TextSpan = {
    start: previous.span.start,
    end: head.span.end,
    text: raw.slice(previous.span.start, head.span.end),
  };
  if (foodIndex(context).has(entryMatchKey(span.text))) return null;

  return {
    key: keyOf(span.text),
    span,
    payload: {
      type: "IDENTITY_DECISION",
      phrase: span.text,
      modifierEntryIds,
      headConceptId: candidate.conceptId,
      cooccurrence: 0,
    },
  };
}

function ambiguousMatch(
  main: PhraseItem[],
  headIndex: number,
  mention: SegmentResolution,
  context: ResolverContext
): Found | null {
  const head = main[headIndex];
  if (head?.kind !== "LEXEME" || mention.resolution.candidates.length < 2)
    return null;
  const foodEntries = head.entryIds.flatMap((id) => {
    const entry = context.entries.get(id);
    return entry?.role === "FOOD" && entry.conceptId ? [entry] : [];
  });
  if (new Set(foodEntries.map((entry) => entry.conceptId)).size < 2)
    return null;

  return {
    key: keyOf(head.span.text),
    span: head.span,
    payload: {
      type: "AMBIGUOUS_MATCH",
      phrase: head.span.text,
      entryIds: foodEntries.map((entry) => entry.id),
    },
  };
}

export interface ConceptDiscovery {
  key: string;
  payload: DiscoveryPayload;
}

/**
 * RELATIONSHIP_SUGGESTION discoveries for concepts whose name ends with another concept's name ("Granny Smith apple" ends with "apple"), unless the two are already related. Suggestions only: a reviewer turns them into relationships.
 *
 * @example
 * suggestRelationships(context)
 * // [{ key: "name-suffix:<granny smith apple>-><apple>", payload: { type: "RELATIONSHIP_SUGGESTION", relationshipType: "IS_A", evidence: "\"granny smith apple\" ends with \"apple\"", ... } }]
 */
export function suggestRelationships(
  context: ResolverContext,
  concepts: readonly { id: string; canonicalName: string }[],
  relationships: readonly { sourceId: string; targetId: string }[]
): ConceptDiscovery[] {
  const related = new Set(
    relationships.flatMap((edge) => [
      `${edge.sourceId}|${edge.targetId}`,
      `${edge.targetId}|${edge.sourceId}`,
    ])
  );
  const byName = new Map<string, string[]>(foodIndex(context));
  for (const concept of concepts) {
    const key = entryMatchKey(concept.canonicalName);
    const ids = byName.get(key) ?? [];
    if (!ids.includes(concept.id)) byName.set(key, [...ids, concept.id]);
  }

  const results: ConceptDiscovery[] = [];
  for (const concept of concepts) {
    const words = entryTokenKeys(concept.canonicalName).filter((token) =>
      /[\p{L}\p{N}]/u.test(token)
    );
    for (let length = words.length - 1; length >= 1; length -= 1) {
      const suffix = words.slice(-length).join(" ");
      const named = byName.get(suffix) ?? [];
      // "pepper" also names black pepper itself, so it is no evidence of a broader concept.
      if (named.includes(concept.id)) break;
      const matches = named;
      if (matches.length === 0) continue;
      const targets = matches.filter(
        (id) => !related.has(`${concept.id}|${id}`)
      );
      for (const targetId of targets) {
        results.push({
          key: `name-suffix:${concept.id}->${targetId}`,
          payload: {
            type: "RELATIONSHIP_SUGGESTION",
            sourceConceptId: concept.id,
            targetConceptId: targetId,
            relationshipType: "IS_A",
            evidence: `"${concept.canonicalName}" ends with "${suffix}"`,
          },
        });
      }
      break;
    }
  }
  return results;
}

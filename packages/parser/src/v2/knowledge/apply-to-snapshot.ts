import { generatePlural } from "./plural.js";
import type { DecisionPayload } from "./schemas.js";

import type { LexiconRole } from "../ast/types.js";
import { entryMatchKey } from "../lexicon/token-trie.js";
import type { LexiconTermKind } from "../ontology/types.js";
import { NOISE_VALUE_KEY } from "../ontology/vocabulary.js";
import type { ResolverSnapshot } from "../resolve/context.js";

type SnapshotEntry = ResolverSnapshot["entries"][number];

/** An entry a decision makes ACTIVE; the target fields match the role. */
export interface SnapshotEntryInput {
  text: string;
  role: LexiconRole;
  kind?: LexiconTermKind | null;
  conceptId?: string | null;
  attributeValueId?: string | null;
  preparationId?: string | null;
  valueKey?: string | null;
}

/**
 * The uniqueness target of an entry, matching the database's `targetKey` column: `food:<conceptId>`, `attr:<attributeValueId>`, `prep:<preparationId>`, or `<role>:<valueKey>`.
 *
 * @example
 * entryTargetKey({ role: "DEGREE", valueKey: "fine" }) // "degree:fine"
 */
export function entryTargetKey(
  entry: Omit<SnapshotEntryInput, "text">
): string {
  switch (entry.role) {
    case "FOOD":
      return `food:${entry.conceptId ?? ""}`;
    case "ATTRIBUTE":
      return `attr:${entry.attributeValueId ?? ""}`;
    case "PREPARATION":
      return `prep:${entry.preparationId ?? ""}`;
    default:
      return `${entry.role.toLowerCase()}:${entry.valueKey ?? ""}`;
  }
}

/**
 * The FOOD entries a phrase decision creates: the phrase itself plus a generated plural when there is one.
 *
 * @example
 * foodEntriesFor("confectioners sugar", <powdered sugar>, "ALIAS")
 * // [{ text: "confectioners sugar", kind: "ALIAS", ... }, { text: "confectioners sugars", kind: "PLURAL", ... }] (no plural for mass nouns)
 */
export function foodEntriesFor(
  phrase: string,
  conceptId: string,
  kind: LexiconTermKind
): SnapshotEntryInput[] {
  const entries: SnapshotEntryInput[] = [
    { text: phrase, role: "FOOD", kind, conceptId },
  ];
  const plural = generatePlural(phrase);
  if (plural && entryMatchKey(plural) !== entryMatchKey(phrase))
    entries.push({ text: plural, role: "FOOD", kind: "PLURAL", conceptId });
  return entries;
}

/** The entries CREATE_CONCEPT adds: CANONICAL, an ALIAS when the phrase differs, and a PLURAL. */
export function createConceptEntries(
  payload: Extract<DecisionPayload, { type: "CREATE_CONCEPT" }>,
  conceptId: string
): SnapshotEntryInput[] {
  const entries: SnapshotEntryInput[] = [
    { text: payload.canonicalName, role: "FOOD", kind: "CANONICAL", conceptId },
  ];
  const keys = new Set([entryMatchKey(payload.canonicalName)]);
  if (!keys.has(entryMatchKey(payload.phrase))) {
    entries.push({
      text: payload.phrase,
      role: "FOOD",
      kind: "ALIAS",
      conceptId,
    });
    keys.add(entryMatchKey(payload.phrase));
  }
  const plural = payload.plural ?? generatePlural(payload.canonicalName);
  if (plural && !keys.has(entryMatchKey(plural)))
    entries.push({ text: plural, role: "FOOD", kind: "PLURAL", conceptId });
  return entries;
}

/** The entry CLASSIFY_MODIFIER or IGNORE_TOKEN makes ACTIVE. */
export function modifierEntryFor(
  payload: Extract<
    DecisionPayload,
    { type: "CLASSIFY_MODIFIER" | "IGNORE_TOKEN" }
  >
): SnapshotEntryInput {
  if (payload.type === "IGNORE_TOKEN")
    return {
      text: payload.token,
      role: "INSTRUCTION",
      valueKey: NOISE_VALUE_KEY,
    };
  return {
    text: payload.token,
    role: payload.role,
    attributeValueId:
      payload.role === "ATTRIBUTE" ? payload.attributeValueId : null,
    preparationId:
      payload.role === "PREPARATION" ? payload.preparationId : null,
    valueKey:
      payload.role === "ATTRIBUTE" || payload.role === "PREPARATION"
        ? null
        : payload.valueKey,
  };
}

/** A random UUID for rows that exist only in a preview snapshot. */
function randomUuid(): string {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (crypto?.randomUUID) return crypto.randomUUID();
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export interface ApplyToSnapshotOptions {
  /** Id generator for created rows; the database assigns its own, so only identity within the snapshot matters. */
  newId?: () => string;
}

/**
 * What the resolver would see after a decision, without touching the database (Phase 4d). Mirrors the effects `applyDecision` writes, so a before/after preview can re-resolve affected lines with both snapshots. Pure: returns a new snapshot with `revision + 1`.
 *
 * REVERT leaves the snapshot unchanged (its effects live in the database; `previewDecision` handles it), as do REJECT, MARK_AMBIGUOUS, and CORRECT_MENTION without `teachPhrase`. MERGE_CONCEPTS cannot check classification conflicts here; the database aborts on them. CORRECT_MENTION also adds a verified-choice prior in the database (`priorVerifiedShare`), which depends on the stored mention and is not modeled here.
 *
 * @example
 * const after = applyDecisionToSnapshot(snapshot, { type: "MAP_TO_CONCEPT", phrase: "confectioners sugar", conceptId: powderedSugar, kind: "ALIAS" });
 * processIngredientLine("2 tbsp confectioners sugar", buildResolverContext(after)) // resolves to powdered sugar
 */
export function applyDecisionToSnapshot(
  snapshot: ResolverSnapshot,
  payload: DecisionPayload,
  { newId = randomUuid }: ApplyToSnapshotOptions = {}
): ResolverSnapshot {
  const copy = JSON.parse(JSON.stringify(snapshot)) as ResolverSnapshot;
  const next: Required<ResolverSnapshot> = {
    ...copy,
    priorVerifiedShare: copy.priorVerifiedShare ?? {},
    revision: snapshot.revision + 1,
  };

  const ensureEntry = (input: SnapshotEntryInput) => {
    const matchKey = entryMatchKey(input.text);
    const targetKey = entryTargetKey(input);
    const existing = next.entries.find(
      (entry) =>
        entryMatchKey(entry.text) === matchKey &&
        entryTargetKey(entry) === targetKey
    );
    if (existing) {
      existing.status = "ACTIVE";
      return;
    }
    const entry: SnapshotEntry = {
      id: newId(),
      text: input.text,
      role: input.role,
      status: "ACTIVE",
      kind: input.kind ?? null,
      conceptId: input.conceptId ?? null,
      attributeValueId: input.attributeValueId ?? null,
      preparationId: input.preparationId ?? null,
      valueKey: input.valueKey ?? null,
    };
    next.entries.push(entry);
  };

  const definitionOf = (attributeValueId: string) =>
    next.vocabulary.definitions.find((definition) =>
      definition.values.some((value) => value.id === attributeValueId)
    )?.id;

  const addApplicability = (
    definitionId: string | undefined,
    conceptId: string
  ) => {
    if (!definitionId) return;
    if (
      !next.applicability.some(
        (row) =>
          row.definitionId === definitionId && row.conceptId === conceptId
      )
    )
      next.applicability.push({ definitionId, conceptId });
  };

  const addRelationship = (
    sourceId: string,
    targetId: string,
    type: ResolverSnapshot["relationships"][number]["type"]
  ) => {
    if (
      !next.relationships.some(
        (edge) =>
          edge.sourceId === sourceId &&
          edge.targetId === targetId &&
          edge.type === type
      )
    )
      next.relationships.push({ sourceId, targetId, type });
  };

  const mapPhrase = (
    phrase: string,
    conceptId: string,
    kind: LexiconTermKind,
    exclusive: boolean
  ) => {
    const entries = foodEntriesFor(phrase, conceptId, kind);
    for (const entry of entries) ensureEntry(entry);
    if (!exclusive) return;
    const keys = new Set(entries.map((entry) => entryMatchKey(entry.text)));
    next.entries = next.entries.filter(
      (entry) =>
        !(
          entry.role === "FOOD" &&
          entry.conceptId !== conceptId &&
          keys.has(entryMatchKey(entry.text))
        )
    );
  };

  switch (payload.type) {
    case "MAP_TO_CONCEPT":
      mapPhrase(
        payload.phrase,
        payload.conceptId,
        payload.kind,
        payload.exclusive ?? false
      );
      break;

    case "CREATE_CONCEPT": {
      const conceptId = newId();
      next.concepts.push({
        id: conceptId,
        canonicalName: payload.canonicalName,
        status: "VERIFIED",
      });
      for (const entry of createConceptEntries(payload, conceptId))
        ensureEntry(entry);
      for (const relationship of payload.relationships)
        addRelationship(
          conceptId,
          relationship.targetConceptId,
          relationship.relationshipType
        );
      for (const attributeValueId of payload.attributeValueIds ?? [])
        next.conceptAttributes.push({ conceptId, attributeValueId });
      break;
    }

    case "CONCEPT_PLUS_ATTRIBUTE":
      for (const attributeValueId of payload.attributeValueIds) {
        if (payload.modifierText)
          ensureEntry({
            text: payload.modifierText,
            role: "ATTRIBUTE",
            attributeValueId,
          });
        addApplicability(definitionOf(attributeValueId), payload.conceptId);
      }
      break;

    case "CLASSIFY_MODIFIER":
      ensureEntry(modifierEntryFor(payload));
      if (payload.role === "ATTRIBUTE" && payload.attributeValueId) {
        for (const conceptId of payload.applicableConceptIds ?? [])
          addApplicability(definitionOf(payload.attributeValueId), conceptId);
      }
      break;

    case "IGNORE_TOKEN":
      ensureEntry(modifierEntryFor(payload));
      break;

    case "ADD_ATTRIBUTE_VALUE": {
      const definition = next.vocabulary.definitions.find(
        (row) => row.id === payload.definitionId
      );
      if (
        definition &&
        !definition.values.some((value) => value.key === payload.key)
      )
        definition.values.push({
          id: newId(),
          key: payload.key,
          label: payload.label,
        });
      for (const conceptId of payload.applicableConceptIds ?? [])
        addApplicability(payload.definitionId, conceptId);
      break;
    }

    case "ADD_RELATIONSHIP":
      addRelationship(
        payload.sourceConceptId,
        payload.targetConceptId,
        payload.relationshipType
      );
      break;

    case "MERGE_CONCEPTS":
      mergeIntoSnapshot(next, payload.survivorId, payload.mergedId);
      break;

    case "CORRECT_MENTION":
      if (payload.teachPhrase && payload.conceptId)
        mapPhrase(payload.teachPhrase, payload.conceptId, "ALIAS", false);
      break;

    case "APPROVE_CONCEPT": {
      const concept = next.concepts.find(
        (row) => row.id === payload.conceptId
      );
      if (concept?.status === "PROPOSED") concept.status = "VERIFIED";
      for (const entry of next.entries)
        if (
          entry.role === "FOOD" &&
          entry.conceptId === payload.conceptId &&
          entry.status === "PROPOSED"
        )
          entry.status = "ACTIVE";
      break;
    }

    case "EDIT_CONCEPT": {
      const concept = next.concepts.find((row) => row.id === payload.conceptId);
      if (concept && payload.canonicalName) concept.canonicalName = payload.canonicalName;
      for (const name of payload.addNames ?? []) {
        ensureEntry({ text: name.text, role: "FOOD", kind: name.kind, conceptId: payload.conceptId });
        const added = next.entries.find(
          (entry) =>
            entry.conceptId === payload.conceptId &&
            entryMatchKey(entry.text) === entryMatchKey(name.text)
        );
        if (added) {
          added.kind = name.kind;
          if (concept?.status === "PROPOSED") added.status = "PROPOSED";
        }
      }
      for (const change of payload.setNameKinds ?? []) {
        const entry = next.entries.find((row) => row.id === change.entryId);
        if (entry) entry.kind = change.kind;
      }
      const retired = new Set(payload.retireEntryIds ?? []);
      next.entries = next.entries.filter((entry) => !retired.has(entry.id));
      for (const relationship of payload.addRelationships ?? [])
        addRelationship(payload.conceptId, relationship.targetConceptId, relationship.relationshipType);
      for (const relationship of payload.retireRelationships ?? [])
        next.relationships = next.relationships.filter(
          (edge) =>
            !(
              edge.sourceId === payload.conceptId &&
              edge.targetId === relationship.targetConceptId &&
              edge.type === relationship.relationshipType
            )
        );
      break;
    }

    case "MARK_AMBIGUOUS":
    case "REJECT":
    case "REVERT":
      break;
  }

  return next;
}

function mergeIntoSnapshot(
  next: Required<ResolverSnapshot>,
  survivorId: string,
  mergedId: string
): void {
  const survivorKeys = new Set(
    next.entries
      .filter((entry) => entry.conceptId === survivorId)
      .map((entry) => entryMatchKey(entry.text))
  );
  next.entries = next.entries.flatMap((entry) => {
    if (entry.conceptId !== mergedId) return [entry];
    const matchKey = entryMatchKey(entry.text);
    if (survivorKeys.has(matchKey)) return [];
    survivorKeys.add(matchKey);
    return [{ ...entry, conceptId: survivorId }];
  });

  const repoint = (id: string) => (id === mergedId ? survivorId : id);
  const unique = <T>(rows: T[], key: (row: T) => string) => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const id = key(row);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  next.relationships = unique(
    next.relationships
      .map((edge) => ({
        ...edge,
        sourceId: repoint(edge.sourceId),
        targetId: repoint(edge.targetId),
      }))
      .filter((edge) => edge.sourceId !== edge.targetId),
    (edge) => `${edge.sourceId}|${edge.targetId}|${edge.type}`
  );
  next.applicability = unique(
    next.applicability.map((row) => ({
      ...row,
      conceptId: repoint(row.conceptId),
    })),
    (row) => `${row.definitionId}|${row.conceptId}`
  );
  next.conceptAttributes = unique(
    next.conceptAttributes.map((row) => ({
      ...row,
      conceptId: repoint(row.conceptId),
    })),
    (row) => `${row.conceptId}|${row.attributeValueId}`
  );
  next.concepts = next.concepts.filter((concept) => concept.id !== mergedId);

  for (const shares of Object.values(next.priorVerifiedShare)) {
    const mergedShare = shares[mergedId];
    if (mergedShare === undefined) continue;
    shares[survivorId] = (shares[survivorId] ?? 0) + mergedShare;
    delete shares[mergedId];
  }
}

/**
 * Which mentions a decision can change: lines containing one of `phrases`, mentions of one of `conceptIds` (callers add hierarchy descendants), and specific `mentionIds`. Previews and reinterpretation prefilter with it (decision D20). APPROVE_CONCEPT names only the concept, so pass the snapshot to include the concept's FOOD entry texts.
 *
 * @example
 * decisionScope({ type: "MAP_TO_CONCEPT", phrase: "scallion", conceptId, kind: "ALIAS" })
 * // { phrases: ["scallion", "scallions"], conceptIds: [conceptId], mentionIds: [] }
 * decisionScope({ type: "APPROVE_CONCEPT", conceptId: drumstickId }, snapshot)
 * // { phrases: ["chicken drumstick", "chicken drumsticks", "drumsticks"], conceptIds: [drumstickId], mentionIds: [] }
 */
export function decisionScope(
  payload: DecisionPayload,
  snapshot?: Pick<ResolverSnapshot, "entries">
): {
  phrases: string[];
  conceptIds: string[];
  mentionIds: string[];
} {
  const phrases = new Set<string>();
  const conceptIds = new Set<string>();
  const mentionIds = new Set<string>();
  const addEntries = (entries: SnapshotEntryInput[]) => {
    for (const entry of entries) phrases.add(entry.text);
  };

  switch (payload.type) {
    case "MAP_TO_CONCEPT":
      addEntries(
        foodEntriesFor(payload.phrase, payload.conceptId, payload.kind)
      );
      conceptIds.add(payload.conceptId);
      break;
    case "CREATE_CONCEPT":
      addEntries(
        createConceptEntries(payload, "00000000-0000-0000-0000-000000000000")
      );
      break;
    case "CONCEPT_PLUS_ATTRIBUTE":
      phrases.add(payload.modifierText ?? payload.phrase);
      conceptIds.add(payload.conceptId);
      break;
    case "CLASSIFY_MODIFIER":
    case "IGNORE_TOKEN":
      phrases.add(payload.token);
      if (payload.type === "CLASSIFY_MODIFIER")
        for (const id of payload.applicableConceptIds ?? []) conceptIds.add(id);
      break;
    case "ADD_ATTRIBUTE_VALUE":
      for (const id of payload.applicableConceptIds ?? []) conceptIds.add(id);
      break;
    case "ADD_RELATIONSHIP":
      conceptIds.add(payload.sourceConceptId);
      conceptIds.add(payload.targetConceptId);
      break;
    case "MERGE_CONCEPTS":
      conceptIds.add(payload.survivorId);
      conceptIds.add(payload.mergedId);
      break;
    case "MARK_AMBIGUOUS":
      phrases.add(payload.phrase);
      break;
    case "CORRECT_MENTION":
      mentionIds.add(payload.mentionId);
      if (payload.teachPhrase && payload.conceptId)
        addEntries(
          foodEntriesFor(payload.teachPhrase, payload.conceptId, "ALIAS")
        );
      break;
    case "EDIT_CONCEPT": {
      conceptIds.add(payload.conceptId);
      if (payload.canonicalName) phrases.add(payload.canonicalName);
      for (const name of payload.addNames ?? []) phrases.add(name.text);
      const touched = new Set([
        ...(payload.retireEntryIds ?? []),
        ...(payload.setNameKinds ?? []).map((change) => change.entryId),
      ]);
      for (const entry of snapshot?.entries ?? [])
        if (touched.has(entry.id)) phrases.add(entry.text);
      for (const relationship of [
        ...(payload.addRelationships ?? []),
        ...(payload.retireRelationships ?? []),
      ])
        conceptIds.add(relationship.targetConceptId);
      break;
    }
    case "APPROVE_CONCEPT":
      conceptIds.add(payload.conceptId);
      for (const entry of snapshot?.entries ?? [])
        if (entry.role === "FOOD" && entry.conceptId === payload.conceptId)
          phrases.add(entry.text);
      break;
    case "REJECT":
    case "REVERT":
      break;
  }
  return {
    phrases: [...phrases],
    conceptIds: [...conceptIds],
    mentionIds: [...mentionIds],
  };
}

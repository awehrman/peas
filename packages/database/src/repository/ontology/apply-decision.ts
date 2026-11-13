import { addAttributeValue, setApplicability } from "./attributes.js";
import { createConcept } from "./concepts.js";
import {
  type DbClient,
  OntologyError,
  computeTargetKey,
  parseOrThrow,
  toJson,
  uuidv7,
} from "./helpers.js";
import { createLexiconEntries, deprecateLexiconEntries } from "./lexicon.js";
import { markMentionVerified } from "./mentions.js";
import { mergeConcepts, undoMerge } from "./merge.js";
import { addRelationship } from "./relationships.js";
import { bumpRevision } from "./revision.js";

import {
  type DecisionEffects,
  DecisionEffectsSchema,
  type DecisionPayload,
  DecisionPayloadSchema,
  type SnapshotEntryInput,
  createConceptEntries,
  editedEntryFor,
  entryMatchKey,
  foodEntriesFor,
  modifierEntryFor,
  normalizeText,
} from "@peas/parser/v2";
import type {
  ConceptStatus,
  EntryStatus,
  LexiconTermKind,
  FoodRelationshipType,
} from "@prisma/client";

import { prisma } from "../../client.js";

/**
 * @example
 * { payload: { type: "MAP_TO_CONCEPT", phrase: "confectioners sugar", conceptId: <powdered sugar>, kind: "ALIAS" }, userId, discoveryId }
 */
export interface ApplyDecisionInput {
  /** Validated with DecisionPayloadSchema. */
  payload: unknown;
  userId: string;
  discoveryId?: string | null;
}

export interface ApplyDecisionResult {
  decisionId: string;
  revision: number;
  payload: DecisionPayload;
  effects: DecisionEffects;
}

interface EffectContext {
  tx: DbClient;
  decisionId: string;
  revision: number;
  userId: string;
  effects: Required<DecisionEffects>;
}

/**
 * Applies a reviewed decision as one transaction (Phase 4c): validates the payload, bumps the revision once, records the LexiconDecision, writes its effects (listing every created, changed, and retired row in `effects` for REVERT), and closes the discovery it answers (REJECTED for REJECT, RESOLVED otherwise).
 *
 * @example
 * const { revision } = await applyDecision({ payload: { type: "IGNORE_TOKEN", token: "good-quality" }, userId });
 */
export async function applyDecision(
  input: ApplyDecisionInput
): Promise<ApplyDecisionResult> {
  return prisma.$transaction((tx) => applyDecisionInTransaction(tx, input), {
    timeout: 60_000,
    maxWait: 10_000,
  });
}

/** `applyDecision` inside the caller's transaction (previews roll it back). */
export async function applyDecisionInTransaction(
  tx: DbClient,
  input: ApplyDecisionInput
): Promise<ApplyDecisionResult> {
  const payload = parseOrThrow(
    DecisionPayloadSchema,
    input.payload,
    "LexiconDecision.payload"
  );
  if (input.discoveryId) {
    const discovery = await tx.discovery.findUnique({
      where: { id: input.discoveryId },
      select: { status: true },
    });
    if (!discovery) throw new OntologyError("That discovery no longer exists");
    if (discovery.status === "RESOLVED" || discovery.status === "REJECTED")
      throw new OntologyError("That discovery was already decided");
  }

  const decisionId = uuidv7();
  const revision = await bumpRevision(tx, `decision:${decisionId}`);
  await tx.lexiconDecision.create({
    data: {
      id: decisionId,
      type: payload.type,
      payload: toJson(payload),
      effects: toJson({ created: [], updated: [], deprecated: [] }),
      discoveryId: input.discoveryId ?? null,
      userId: input.userId,
      revision,
    },
  });

  const context: EffectContext = {
    tx,
    decisionId,
    revision,
    userId: input.userId,
    effects: {
      created: [],
      updated: [],
      deprecated: [],
      applicabilityAdded: [],
    },
  };
  await applyEffects(context, payload);

  const effects = parseOrThrow(
    DecisionEffectsSchema,
    context.effects,
    "LexiconDecision.effects"
  );
  await tx.lexiconDecision.update({
    where: { id: decisionId },
    data: { effects: toJson(effects) },
  });

  if (input.discoveryId) {
    await tx.discovery.update({
      where: { id: input.discoveryId },
      data: {
        status: payload.type === "REJECT" ? "REJECTED" : "RESOLVED",
        resolvedByDecisionId: decisionId,
      },
    });
  }

  return { decisionId, revision, payload, effects };
}

/**
 * Sets a discovery aside without deciding it (no revision; it leaves the open queue until reopened).
 *
 * @example
 * await deferDiscovery(discoveryId)
 */
export async function deferDiscovery(
  id: string,
  db: DbClient = prisma
): Promise<void> {
  const discovery = await db.discovery.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!discovery) throw new OntologyError("That discovery no longer exists");
  if (discovery.status !== "OPEN")
    throw new OntologyError("Only open discoveries can be deferred");
  await db.discovery.update({ where: { id }, data: { status: "DEFERRED" } });
}

/** Creates the entries or activates existing ones (recording their previous status). */
async function ensureActiveEntries(
  context: EffectContext,
  inputs: readonly SnapshotEntryInput[]
): Promise<void> {
  const { tx, effects } = context;
  for (const input of inputs) {
    const matchKey = entryMatchKey(input.text);
    const targetKey = computeTargetKey(input);
    const existing = await tx.lexiconEntry.findUnique({
      where: { matchKey_targetKey: { matchKey, targetKey } },
      select: { id: true, status: true },
    });
    if (existing) {
      if (existing.status !== "ACTIVE") {
        await tx.lexiconEntry.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", revisionRetired: null },
        });
        effects.updated.push({
          table: "LexiconEntry",
          id: existing.id,
          previous: existing.status,
        });
      }
      continue;
    }
    const [created] = await createLexiconEntries(
      tx,
      [
        {
          ...input,
          kind: input.role === "FOOD" ? (input.kind ?? null) : null,
          status: "ACTIVE",
          decisionId: context.decisionId,
        },
      ],
      context.revision
    );
    if (created)
      effects.created.push({ table: "LexiconEntry", id: created.id });
  }
}

async function addApplicability(
  context: EffectContext,
  definitionId: string,
  conceptIds: readonly string[]
): Promise<void> {
  const existing = await context.tx.attributeApplicability.findMany({
    where: { definitionId, conceptId: { in: [...conceptIds] } },
    select: { conceptId: true },
  });
  const present = new Set(existing.map((row) => row.conceptId));
  const missing = conceptIds.filter((id) => !present.has(id));
  await setApplicability(context.tx, definitionId, missing);
  for (const conceptId of missing)
    context.effects.applicabilityAdded.push({ definitionId, conceptId });
}

async function definitionOf(
  tx: DbClient,
  attributeValueId: string
): Promise<string> {
  const value = await tx.attributeValue.findUnique({
    where: { id: attributeValueId },
    select: { definitionId: true },
  });
  if (!value) throw new OntologyError("That attribute value does not exist");
  return value.definitionId;
}

async function ensureActiveRelationship(
  context: EffectContext,
  sourceId: string,
  targetId: string,
  type: FoodRelationshipType
): Promise<void> {
  const { tx, effects } = context;
  const existing = await tx.foodRelationship.findUnique({
    where: { sourceId_targetId_type: { sourceId, targetId, type } },
    select: { id: true, status: true },
  });
  if (existing?.status === "ACTIVE") return;
  if (existing?.status === "PROPOSED") {
    await tx.foodRelationship.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", decisionId: context.decisionId },
    });
    effects.updated.push({
      table: "FoodRelationship",
      id: existing.id,
      previous: "PROPOSED",
    });
    return;
  }
  // A deprecated edge is replaced, so the cycle check runs again.
  if (existing)
    await tx.foodRelationship.delete({ where: { id: existing.id } });
  const { id } = await addRelationship(tx, {
    sourceId,
    targetId,
    type,
    status: "ACTIVE",
    decisionId: context.decisionId,
  });
  effects.created.push({ table: "FoodRelationship", id });
}

async function mapPhrase(
  context: EffectContext,
  phrase: string,
  conceptId: string,
  kind: SnapshotEntryInput["kind"] & string,
  exclusive: boolean
): Promise<void> {
  const concept = await context.tx.foodConcept.findUnique({
    where: { id: conceptId },
    select: { status: true },
  });
  if (!concept || concept.status === "DEPRECATED")
    throw new OntologyError(
      "Map phrases to an existing, non-deprecated concept"
    );
  const entries = foodEntriesFor(phrase, conceptId, kind);
  await ensureActiveEntries(context, entries);
  if (!exclusive) return;

  const others = await context.tx.lexiconEntry.findMany({
    where: {
      role: "FOOD",
      matchKey: { in: entries.map((entry) => entryMatchKey(entry.text)) },
      conceptId: { not: conceptId },
      status: { not: "DEPRECATED" },
    },
    select: { id: true, status: true },
  });
  await deprecateLexiconEntries(
    context.tx,
    others.map((entry) => entry.id),
    context.revision
  );
  for (const entry of others)
    context.effects.deprecated.push({
      table: "LexiconEntry",
      id: entry.id,
      previous: entry.status,
    });
}

async function applyEffects(
  context: EffectContext,
  payload: DecisionPayload
): Promise<void> {
  const { tx, effects } = context;

  switch (payload.type) {
    case "MAP_TO_CONCEPT":
      await mapPhrase(
        context,
        payload.phrase,
        payload.conceptId,
        payload.kind,
        payload.exclusive ?? false
      );
      return;

    case "CREATE_CONCEPT": {
      const { id } = await createConcept(tx, {
        canonicalName: payload.canonicalName,
        status: "VERIFIED",
      });
      effects.created.push({ table: "FoodConcept", id });
      await ensureActiveEntries(context, createConceptEntries(payload, id));
      for (const relationship of payload.relationships)
        await ensureActiveRelationship(
          context,
          id,
          relationship.targetConceptId,
          relationship.relationshipType
        );
      const attributeValueIds = [...new Set(payload.attributeValueIds ?? [])];
      if (attributeValueIds.length > 0) {
        await tx.conceptAttribute.createMany({
          data: attributeValueIds.map((attributeValueId) => ({
            conceptId: id,
            attributeValueId,
            source: "MANUAL" as const,
          })),
        });
      }
      return;
    }

    case "CONCEPT_PLUS_ATTRIBUTE":
      for (const attributeValueId of payload.attributeValueIds) {
        if (payload.modifierText)
          await ensureActiveEntries(context, [
            { text: payload.modifierText, role: "ATTRIBUTE", attributeValueId },
          ]);
        await addApplicability(
          context,
          await definitionOf(tx, attributeValueId),
          [payload.conceptId]
        );
      }
      return;

    case "CLASSIFY_MODIFIER":
      await ensureActiveEntries(context, [modifierEntryFor(payload)]);
      if (
        payload.role === "ATTRIBUTE" &&
        payload.attributeValueId &&
        payload.applicableConceptIds?.length
      )
        await addApplicability(
          context,
          await definitionOf(tx, payload.attributeValueId),
          payload.applicableConceptIds
        );
      return;

    case "IGNORE_TOKEN":
      await ensureActiveEntries(context, [modifierEntryFor(payload)]);
      return;

    case "ADD_ATTRIBUTE_VALUE": {
      const existing = await tx.attributeValue.findUnique({
        where: {
          definitionId_key: {
            definitionId: payload.definitionId,
            key: payload.key,
          },
        },
        select: { id: true },
      });
      if (!existing) {
        const { id } = await addAttributeValue(tx, {
          definitionId: payload.definitionId,
          key: payload.key,
          label: payload.label,
        });
        effects.created.push({ table: "AttributeValue", id });
      }
      if (payload.applicableConceptIds?.length)
        await addApplicability(
          context,
          payload.definitionId,
          payload.applicableConceptIds
        );
      return;
    }

    case "ADD_RELATIONSHIP":
      await ensureActiveRelationship(
        context,
        payload.sourceConceptId,
        payload.targetConceptId,
        payload.relationshipType
      );
      return;

    case "MERGE_CONCEPTS": {
      const recordId = await mergeConcepts(tx, {
        survivorId: payload.survivorId,
        mergedId: payload.mergedId,
        decisionId: context.decisionId,
      });
      effects.created.push({ table: "ConceptMergeRecord", id: recordId });
      effects.deprecated.push({ table: "FoodConcept", id: payload.mergedId });
      return;
    }

    case "CORRECT_MENTION": {
      const mention = await tx.ingredientMention.findUnique({
        where: { id: payload.mentionId },
        select: { id: true },
      });
      if (!mention) throw new OntologyError("That mention no longer exists");
      await markMentionVerified(tx, payload.mentionId, context.userId, {
        conceptId: payload.conceptId,
        attributeValueIds: payload.attributeValueIds,
      });
      effects.updated.push({
        table: "IngredientMention",
        id: payload.mentionId,
      });
      if (payload.teachPhrase && payload.conceptId)
        await mapPhrase(
          context,
          payload.teachPhrase,
          payload.conceptId,
          "ALIAS",
          false
        );
      return;
    }

    case "APPROVE_CONCEPT": {
      const concept = await tx.foodConcept.findUnique({
        where: { id: payload.conceptId },
        select: { status: true },
      });
      if (!concept) throw new OntologyError("That concept does not exist");
      if (concept.status !== "PROPOSED")
        throw new OntologyError(
          `Only proposed concepts can be approved; this one is ${concept.status.toLowerCase()}`
        );
      await tx.foodConcept.update({
        where: { id: payload.conceptId },
        data: { status: "VERIFIED" },
      });
      effects.updated.push({
        table: "FoodConcept",
        id: payload.conceptId,
        previous: "PROPOSED",
      });
      const entries = await tx.lexiconEntry.findMany({
        where: {
          conceptId: payload.conceptId,
          role: "FOOD",
          status: "PROPOSED",
        },
        select: { id: true },
      });
      if (entries.length > 0)
        await tx.lexiconEntry.updateMany({
          where: { id: { in: entries.map((entry) => entry.id) } },
          data: { status: "ACTIVE" },
        });
      for (const entry of entries)
        effects.updated.push({
          table: "LexiconEntry",
          id: entry.id,
          previous: "PROPOSED",
        });
      return;
    }

    case "EDIT_CONCEPT":
      await editConcept(context, payload);
      return;

    case "EDIT_ENTRY":
      await editEntry(context, payload);
      return;

    case "REVERT":
      await revertDecision(context, payload.decisionId);
      return;

    case "MARK_AMBIGUOUS":
    case "REJECT":
      return;
  }
}

/** The ingredient card's lexicon changes; every changed row is recorded with what it was, so REVERT puts it back. */
async function editConcept(
  context: EffectContext,
  payload: Extract<DecisionPayload, { type: "EDIT_CONCEPT" }>
): Promise<void> {
  const { tx, effects } = context;
  const concept = await tx.foodConcept.findUnique({
    where: { id: payload.conceptId },
    select: { canonicalName: true, status: true },
  });
  if (!concept) throw new OntologyError("That concept does not exist");
  if (concept.status === "DEPRECATED")
    throw new OntologyError("A merged concept cannot be edited");

  if (payload.canonicalName && payload.canonicalName !== concept.canonicalName) {
    await tx.foodConcept.update({
      where: { id: payload.conceptId },
      data: { canonicalName: payload.canonicalName },
    });
    effects.updated.push({
      table: "FoodConcept",
      id: payload.conceptId,
      previous: concept.status,
      previousName: concept.canonicalName,
    });
  }

  const targetKey = computeTargetKey({ role: "FOOD", conceptId: payload.conceptId });
  // A proposed food's new names stay proposed until it is approved
  const nameStatus = concept.status === "PROPOSED" ? "PROPOSED" : "ACTIVE";
  for (const name of payload.addNames ?? []) {
    const existing = await tx.lexiconEntry.findUnique({
      where: {
        matchKey_targetKey: { matchKey: entryMatchKey(name.text), targetKey },
      },
      select: { id: true, status: true, kind: true },
    });
    if (!existing) {
      const [created] = await createLexiconEntries(
        tx,
        [
          {
            text: name.text,
            role: "FOOD",
            kind: name.kind,
            conceptId: payload.conceptId,
            status: nameStatus,
            decisionId: context.decisionId,
          },
        ],
        context.revision
      );
      if (created) effects.created.push({ table: "LexiconEntry", id: created.id });
      continue;
    }
    if (existing.status !== "DEPRECATED" && existing.kind === name.kind) continue;
    await tx.lexiconEntry.update({
      where: { id: existing.id },
      data: {
        status: existing.status === "DEPRECATED" ? nameStatus : existing.status,
        kind: name.kind,
        revisionRetired: null,
      },
    });
    effects.updated.push({
      table: "LexiconEntry",
      id: existing.id,
      previous: existing.status,
      ...(existing.kind ? { previousKind: existing.kind } : {}),
    });
  }

  for (const change of payload.setNameKinds ?? []) {
    const entry = await tx.lexiconEntry.findFirst({
      where: { id: change.entryId, conceptId: payload.conceptId },
      select: { status: true, kind: true },
    });
    if (!entry) throw new OntologyError("That name does not belong to this concept");
    if (entry.kind === change.kind) continue;
    await tx.lexiconEntry.update({
      where: { id: change.entryId },
      data: { kind: change.kind },
    });
    effects.updated.push({
      table: "LexiconEntry",
      id: change.entryId,
      previous: entry.status,
      ...(entry.kind ? { previousKind: entry.kind } : {}),
    });
  }

  for (const entryId of payload.retireEntryIds ?? []) {
    const entry = await tx.lexiconEntry.findFirst({
      where: { id: entryId, conceptId: payload.conceptId },
      select: { status: true },
    });
    if (!entry) throw new OntologyError("That name does not belong to this concept");
    if (entry.status === "DEPRECATED") continue;
    await tx.lexiconEntry.update({
      where: { id: entryId },
      data: { status: "DEPRECATED", revisionRetired: context.revision },
    });
    effects.deprecated.push({ table: "LexiconEntry", id: entryId, previous: entry.status });
  }

  for (const relationship of payload.addRelationships ?? [])
    await ensureActiveRelationship(
      context,
      payload.conceptId,
      relationship.targetConceptId,
      relationship.relationshipType
    );

  for (const relationship of payload.retireRelationships ?? []) {
    const edge = await tx.foodRelationship.findFirst({
      where: {
        sourceId: payload.conceptId,
        targetId: relationship.targetConceptId,
        type: relationship.relationshipType,
        status: { not: "DEPRECATED" },
      },
      select: { id: true, status: true },
    });
    if (!edge) continue;
    await tx.foodRelationship.update({
      where: { id: edge.id },
      data: { status: "DEPRECATED" },
    });
    effects.deprecated.push({ table: "FoodRelationship", id: edge.id, previous: edge.status });
  }
}

/** Checks that the edited entry's new target exists (and, for a food, isn't merged away). */
async function assertEntryTarget(
  tx: DbClient,
  payload: Extract<DecisionPayload, { type: "EDIT_ENTRY" }>
): Promise<void> {
  if (payload.role === "FOOD" && payload.conceptId) {
    const concept = await tx.foodConcept.findUnique({
      where: { id: payload.conceptId },
      select: { status: true },
    });
    if (!concept || concept.status === "DEPRECATED")
      throw new OntologyError("Point food names at an existing, non-merged concept");
  }
  if (payload.role === "ATTRIBUTE" && payload.attributeValueId)
    await definitionOf(tx, payload.attributeValueId);
  if (payload.role === "PREPARATION" && payload.preparationId) {
    const preparation = await tx.preparationOperation.findUnique({
      where: { id: payload.preparationId },
      select: { id: true },
    });
    if (!preparation) throw new OntologyError("That preparation does not exist");
  }
}

/**
 * One lexicon entry edited on the lexicon page. Same match key and target: the status, kind, and spelling change in place. Otherwise the entry is retired and its replacement is created, or an existing entry with that text and target takes the new status. Every row is recorded with what it was, so REVERT puts it back.
 */
async function editEntry(
  context: EffectContext,
  payload: Extract<DecisionPayload, { type: "EDIT_ENTRY" }>
): Promise<void> {
  const { tx, effects } = context;
  const entry = await tx.lexiconEntry.findUnique({
    where: { id: payload.entryId },
    select: { text: true, kind: true, status: true, matchKey: true, targetKey: true },
  });
  if (!entry) throw new OntologyError("That lexicon entry does not exist");
  await assertEntryTarget(tx, payload);

  const replacement = editedEntryFor(payload);
  const matchKey = entryMatchKey(payload.text);
  const targetKey = computeTargetKey(replacement);
  const kind = (replacement.kind ?? null) as LexiconTermKind | null;
  const status = payload.status as EntryStatus;

  const updateInPlace = async (
    id: string,
    current: { text: string; kind: LexiconTermKind | null; status: EntryStatus }
  ) => {
    const changed =
      current.status !== status || current.kind !== kind || current.text !== payload.text;
    if (!changed) return false;
    await tx.lexiconEntry.update({
      where: { id },
      data: {
        status,
        kind,
        text: payload.text,
        normalized: normalizeText(payload.text).text,
        revisionRetired: status === "DEPRECATED" ? context.revision : null,
      },
    });
    const row = {
      table: "LexiconEntry",
      id,
      previous: current.status,
      ...(current.kind ? { previousKind: current.kind } : {}),
      ...(current.text !== payload.text ? { previousText: current.text } : {}),
    };
    if (status === "DEPRECATED") effects.deprecated.push(row);
    else effects.updated.push(row);
    return true;
  };

  if (matchKey === entry.matchKey && targetKey === entry.targetKey) {
    if (!(await updateInPlace(payload.entryId, entry)))
      throw new OntologyError("Nothing changed on that entry");
    return;
  }

  if (entry.status !== "DEPRECATED") {
    await deprecateLexiconEntries(tx, [payload.entryId], context.revision);
    effects.deprecated.push({ table: "LexiconEntry", id: payload.entryId, previous: entry.status });
  }
  if (status === "DEPRECATED") return;

  const existing = await tx.lexiconEntry.findUnique({
    where: { matchKey_targetKey: { matchKey, targetKey } },
    select: { id: true, text: true, kind: true, status: true },
  });
  if (existing) {
    await updateInPlace(existing.id, existing);
    return;
  }
  const [created] = await createLexiconEntries(
    tx,
    [{ ...replacement, kind, status, decisionId: context.decisionId }],
    context.revision
  );
  if (created) effects.created.push({ table: "LexiconEntry", id: created.id });
}

/**
 * Undoes a decision's recorded effects: created entries, relationships, and concepts are retired, activated or deprecated rows get their previous status back, added applicability is removed, and merges are undone from their snapshot. Mention corrections and new attribute values stay (they are harmless to keep). Reopens the decision's discovery.
 */
async function revertDecision(
  context: EffectContext,
  targetId: string
): Promise<void> {
  const { tx } = context;
  const target = await tx.lexiconDecision.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      type: true,
      effects: true,
      revertedById: true,
      discoveryId: true,
    },
  });
  if (!target) throw new OntologyError("That decision does not exist");
  if (target.type === "REVERT")
    throw new OntologyError(
      "A revert cannot be reverted; apply the decision again instead"
    );
  if (target.revertedById)
    throw new OntologyError("That decision was already reverted");
  const effects = parseOrThrow(
    DecisionEffectsSchema,
    target.effects,
    "LexiconDecision.effects"
  );

  if (target.type === "MERGE_CONCEPTS") {
    for (const row of effects.created.filter(
      (row) => row.table === "ConceptMergeRecord"
    ))
      await undoMerge(tx, row.id);
  } else {
    const createdOf = (table: string) =>
      effects.created.filter((row) => row.table === table).map((row) => row.id);
    await deprecateLexiconEntries(
      tx,
      createdOf("LexiconEntry"),
      context.revision
    );
    const relationships = createdOf("FoodRelationship");
    if (relationships.length > 0)
      await tx.foodRelationship.updateMany({
        where: { id: { in: relationships } },
        data: { status: "DEPRECATED" },
      });
    const concepts = createdOf("FoodConcept");
    if (concepts.length > 0)
      await tx.foodConcept.updateMany({
        where: { id: { in: concepts } },
        data: { status: "DEPRECATED" },
      });

    for (const row of [...effects.updated, ...effects.deprecated]) {
      if (!row.previous) continue;
      if (row.table === "LexiconEntry") {
        const previous = row.previous as EntryStatus;
        await tx.lexiconEntry.update({
          where: { id: row.id },
          data: {
            status: previous,
            revisionRetired:
              previous === "DEPRECATED" ? context.revision : null,
            ...(row.previousKind
              ? { kind: row.previousKind as LexiconTermKind }
              : {}),
            ...(row.previousText
              ? {
                  text: row.previousText,
                  normalized: normalizeText(row.previousText).text,
                }
              : {}),
          },
        });
      } else if (row.table === "FoodRelationship") {
        await tx.foodRelationship.update({
          where: { id: row.id },
          data: { status: row.previous as EntryStatus },
        });
      } else if (row.table === "FoodConcept") {
        await tx.foodConcept.update({
          where: { id: row.id },
          data: {
            status: row.previous as ConceptStatus,
            ...(row.previousName ? { canonicalName: row.previousName } : {}),
          },
        });
      }
    }
    for (const row of effects.applicabilityAdded ?? []) {
      await tx.attributeApplicability.deleteMany({
        where: { definitionId: row.definitionId, conceptId: row.conceptId },
      });
    }
  }

  await tx.lexiconDecision.update({
    where: { id: target.id },
    data: { revertedById: context.decisionId },
  });
  if (target.discoveryId) {
    await tx.discovery.update({
      where: { id: target.discoveryId },
      data: { status: "OPEN", resolvedByDecisionId: null },
    });
  }
}

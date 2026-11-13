"use client";

import {
  CLASSIFICATION_KINDS,
  CLASSIFICATION_KIND_LABELS,
  CLASSIFICATION_VALUES,
  CLASSIFICATION_VALUE_LABELS,
  classificationKey,
  classificationLabel,
} from "./classification";
import { EntryList } from "./entry-list";
import type {
  ClassificationKind,
  ClassificationValue,
  ConceptDetail,
  ConceptEditActions,
  ConceptRelationship,
} from "./types";

import { type ReactNode, useId, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  InlineSelect,
  UnderlineInput,
} from "@peas/components";
import { Pencil, X } from "lucide-react";

import { AppLink } from "../app-navigation";
import { IngredientPicker } from "../ingredients/components/ingredient-picker";
import type { IngredientOption } from "../ingredients/types";
import {
  AddableLabel,
  ChipInput,
  InlineError,
  type MutationAction,
} from "../shared";
import { useImpactConfirmation } from "../teach/impact-confirmation";
import type {
  ApplyDecisionResult,
  ConceptRef,
  DecisionPayload,
  PreviewDecision,
  SearchConcepts,
} from "../teach/types";

const RELATIONSHIP_TYPES = [
  "IS_A",
  "PART_OF",
  "DERIVED_FROM",
  "PROCESSED_FROM",
] as const;
type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

const RELATIONSHIP_LABELS: Record<string, string> = {
  IS_A: "is a kind of",
  PART_OF: "is part of",
  DERIVED_FROM: "is made from",
  PROCESSED_FROM: "is processed from",
};

const NAME_KINDS = [
  "CANONICAL",
  "ALIAS",
  "PLURAL",
  "REGIONAL",
  "ABBREVIATION",
  "VARIANT",
] as const;
type NameKind = (typeof NAME_KINDS)[number];

const NAME_KIND_LABELS: Record<NameKind, string> = {
  CANONICAL: "main name",
  ALIAS: "alternate name",
  PLURAL: "plural",
  REGIONAL: "regional name",
  ABBREVIATION: "abbreviation",
  VARIANT: "spelling variant",
};

export interface ConceptCardProps extends ConceptEditActions {
  concept: ConceptDetail;
  onApplyDecision?: MutationAction<
    [payload: DecisionPayload, discoveryId: string | null],
    ApplyDecisionResult
  >;
  /** Checks what a name or relationship change would do to stored mentions before saving. */
  onPreview?: PreviewDecision;
  onSearchConcepts?: SearchConcepts;
}

/**
 * What a concept is: its names, relationships, attributes, classifications, tags, and substitutions. Read-only with an edit button; edit mode works like the ingredient card (inline dropdowns, one Save, Cancel discards). Name and relationship changes are one EDIT_CONCEPT decision, previewed first; the rest is written directly. Without `onApplyDecision` and `onSearchConcepts` there is no edit button.
 *
 * @example
 * <ConceptCard concept={concept} onApplyDecision={apply} onPreview={preview} onSearchConcepts={search} onSetTags={setTags} />
 */
export function ConceptCard(props: ConceptCardProps): ReactNode {
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = Boolean(props.onApplyDecision && props.onSearchConcepts);
  if (isEditing && canEdit)
    return (
      <ConceptCardEditor
        {...props}
        onDone={(result) => {
          setIsEditing(false);
          if (result) setMessage(result);
        }}
      />
    );
  return (
    <ConceptCardView
      concept={props.concept}
      message={message}
      onEdit={
        canEdit
          ? () => {
              setMessage(null);
              setIsEditing(true);
            }
          : undefined
      }
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-greyscale-900">{label}</h3>
      {children}
    </div>
  );
}

const conceptLink = (concept: ConceptRef) => (
  <AppLink
    href={`/concepts/${concept.id}`}
    className="text-primary underline underline-offset-2"
  >
    {concept.canonicalName}
  </AppLink>
);

function RelationshipLines({
  name,
  edges,
  direction,
}: {
  name: string;
  edges: ConceptRelationship[];
  direction: "parent" | "child";
}): ReactNode {
  if (edges.length === 0)
    return (
      <p className="text-sm text-greyscale-600">
        {direction === "parent"
          ? "No broader concepts yet."
          : "No narrower concepts yet."}
      </p>
    );
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {edges.map((edge) => (
        <li key={edge.id}>
          {direction === "parent" ? (
            <>
              {name} {RELATIONSHIP_LABELS[edge.type] ?? edge.type}{" "}
              {conceptLink(edge.concept)}
            </>
          ) : (
            <>
              {conceptLink(edge.concept)}{" "}
              {RELATIONSHIP_LABELS[edge.type] ?? edge.type} {name}
            </>
          )}
          {edge.status !== "ACTIVE" ? (
            <span className="ml-2 text-xs text-greyscale-600">
              ({edge.status.toLowerCase()})
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ConceptCardView({
  concept,
  message,
  onEdit,
}: {
  concept: ConceptDetail;
  message: string | null;
  onEdit?: () => void;
}): ReactNode {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-greyscale-900">
            What Peas knows
          </h2>
          {onEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Edit ${concept.canonicalName}`}
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        {message ? (
          <p role="status" className="text-sm text-success-900">
            {message}
          </p>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Names">
            <EntryList
              entries={concept.entries.filter(
                (entry) => entry.status !== "DEPRECATED"
              )}
            />
          </Field>
          <Field label="More general">
            <RelationshipLines
              name={concept.canonicalName}
              edges={concept.parents}
              direction="parent"
            />
          </Field>
          <Field label="More specific">
            <RelationshipLines
              name={concept.canonicalName}
              edges={concept.children}
              direction="child"
            />
          </Field>
          <Field label="Attributes">
            {concept.attributes.length === 0 ? (
              <p className="text-sm text-greyscale-600">
                No characterizing attributes.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {concept.attributes.map((attribute) => (
                  <li key={attribute.attributeValueId}>
                    <Badge variant="secondary">
                      {attribute.definitionKey}: {attribute.label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <Field label="Classifications">
            {concept.classifications.length === 0 ? (
              <p className="text-sm text-greyscale-600">No classifications.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {concept.classifications.map((row) => (
                  <li key={row.key}>
                    <span className="font-medium">
                      {classificationLabel(row.key)}
                    </span>{" "}
                    <span className="text-greyscale-600">
                      (
                      {CLASSIFICATION_KIND_LABELS[
                        row.kind as ClassificationKind
                      ] ?? row.kind.toLowerCase()}
                      )
                    </span>
                    :{" "}
                    {CLASSIFICATION_VALUE_LABELS[
                      row.value as ClassificationValue
                    ] ?? row.value}
                    {row.source === "INHERITED" && row.inheritedFrom ? (
                      <span className="text-greyscale-600">
                        {" "}
                        (inherited from {conceptLink(row.inheritedFrom)})
                      </span>
                    ) : row.source === "CONFLICT" ? (
                      <span className="text-error-700">
                        {" "}
                        (conflicting parents)
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <Field label="Tags">
            {concept.tags.length === 0 ? (
              <p className="text-sm text-greyscale-600">No tags.</p>
            ) : (
              <ul className="flex flex-wrap gap-1 text-sm" aria-label="Tags">
                {concept.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-greyscale-100 px-2 py-0.5 text-greyscale-800"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <Field label="Substitutions">
            {concept.substitutions.length === 0 ? (
              <p className="text-sm text-greyscale-600">No substitutions.</p>
            ) : (
              <ul
                className="flex flex-col gap-1 text-sm"
                aria-label="Substitutions"
              >
                {concept.substitutions.map((row) => (
                  <li key={row.concept.id}>
                    {conceptLink(row.concept)}
                    {row.ratio ? (
                      <span className="text-greyscale-700"> ({row.ratio})</span>
                    ) : null}
                    {row.note ? (
                      <span className="text-greyscale-600">: {row.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

interface NameDraft {
  /** Null for a name added in this edit. */
  id: string | null;
  text: string;
  kind: NameKind;
}

interface ParentDraft {
  targetId: string;
  targetName: string;
  type: RelationshipType;
  /** The stored type, for relationships that existed before this edit. */
  storedType: RelationshipType | null;
}

interface ClassificationDraft {
  key: string;
  kind: ClassificationKind;
  value: ClassificationValue;
}

interface SubstitutionDraft {
  conceptId: string;
  name: string;
  ratio: string;
  note: string;
}

interface ConceptDraft {
  canonicalName: string;
  names: NameDraft[];
  parents: ParentDraft[];
  classifications: ClassificationDraft[];
  tags: string[];
  substitutions: SubstitutionDraft[];
}

const isNameKind = (kind: string | null): kind is NameKind =>
  kind !== null && (NAME_KINDS as readonly string[]).includes(kind);
const isRelationshipType = (type: string): type is RelationshipType =>
  (RELATIONSHIP_TYPES as readonly string[]).includes(type);

function draftOf(concept: ConceptDetail): ConceptDraft {
  return {
    canonicalName: concept.canonicalName,
    names: concept.entries
      .filter((entry) => entry.status !== "DEPRECATED")
      .map((entry) => ({
        id: entry.id,
        text: entry.text,
        kind: isNameKind(entry.kind) ? entry.kind : "ALIAS",
      })),
    parents: concept.parents
      .filter((edge) => edge.status !== "DEPRECATED")
      .flatMap((edge) =>
        isRelationshipType(edge.type)
          ? [
              {
                targetId: edge.concept.id,
                targetName: edge.concept.canonicalName,
                type: edge.type,
                storedType: edge.type,
              },
            ]
          : []
      ),
    classifications: concept.classifications
      .filter((row) => row.isExplicit)
      .map((row) => ({
        key: row.key,
        kind: row.kind as ClassificationKind,
        value: row.value as ClassificationValue,
      })),
    tags: concept.tags,
    substitutions: concept.substitutions.map((row) => ({
      conceptId: row.concept.id,
      name: row.concept.canonicalName,
      ratio: row.ratio ?? "",
      note: row.note ?? "",
    })),
  };
}

const matchKey = (text: string) => text.trim().toLowerCase();

/**
 * The EDIT_CONCEPT decision for the draft's name and relationship changes, or null when there are none. Renaming adds the new main name and turns the old one into an alternate name, as the ingredient card does.
 *
 * @example
 * conceptEditPayload(concept, { ...draftOf(concept), canonicalName: "green onion" })
 * // { type: "EDIT_CONCEPT", conceptId, canonicalName: "green onion", addNames: [{ text: "green onion", kind: "CANONICAL" }], setNameKinds: [{ entryId: <scallion>, kind: "ALIAS" }] }
 */
export function conceptEditPayload(
  concept: ConceptDetail,
  draft: ConceptDraft
): Extract<DecisionPayload, { type: "EDIT_CONCEPT" }> | null {
  const stored = new Map(
    concept.entries
      .filter((entry) => entry.status !== "DEPRECATED")
      .map((entry) => [entry.id, entry])
  );
  const names = draft.names.map((name) => ({ ...name }));
  const canonicalName = draft.canonicalName.trim();
  const renamed =
    canonicalName.length > 0 && canonicalName !== concept.canonicalName;
  if (renamed) {
    for (const name of names)
      if (name.kind === "CANONICAL") name.kind = "ALIAS";
    const existing = names.find(
      (name) => matchKey(name.text) === matchKey(canonicalName)
    );
    if (existing) existing.kind = "CANONICAL";
    else names.push({ id: null, text: canonicalName, kind: "CANONICAL" });
  }

  const kept = new Set(names.flatMap((name) => (name.id ? [name.id] : [])));
  const addNames = names
    .filter((name) => name.id === null && name.text.trim())
    .map((name) => ({ text: name.text.trim(), kind: name.kind }));
  const setNameKinds = names.flatMap((name) => {
    const entry = name.id ? stored.get(name.id) : undefined;
    return entry && name.id && entry.kind !== name.kind
      ? [{ entryId: name.id, kind: name.kind }]
      : [];
  });
  const retireEntryIds = [...stored.keys()].filter((id) => !kept.has(id));

  const storedParents = concept.parents.filter(
    (edge) => edge.status !== "DEPRECATED" && isRelationshipType(edge.type)
  );
  const draftKey = (targetId: string, type: string) => `${targetId}|${type}`;
  const draftKeys = new Set(
    draft.parents.map((parent) => draftKey(parent.targetId, parent.type))
  );
  const storedKeys = new Set(
    storedParents.map((edge) => draftKey(edge.concept.id, edge.type))
  );
  const retireRelationships = storedParents
    .filter((edge) => !draftKeys.has(draftKey(edge.concept.id, edge.type)))
    .map((edge) => ({
      targetConceptId: edge.concept.id,
      relationshipType: edge.type as RelationshipType,
    }));
  const addRelationships = draft.parents
    .filter((parent) => !storedKeys.has(draftKey(parent.targetId, parent.type)))
    .map((parent) => ({
      targetConceptId: parent.targetId,
      relationshipType: parent.type,
    }));

  const payload: Extract<DecisionPayload, { type: "EDIT_CONCEPT" }> = {
    type: "EDIT_CONCEPT",
    conceptId: concept.id,
    ...(renamed ? { canonicalName } : {}),
    ...(addNames.length ? { addNames } : {}),
    ...(setNameKinds.length ? { setNameKinds } : {}),
    ...(retireEntryIds.length ? { retireEntryIds } : {}),
    ...(addRelationships.length ? { addRelationships } : {}),
    ...(retireRelationships.length ? { retireRelationships } : {}),
  };
  return Object.keys(payload).length > 2 ? payload : null;
}

function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded p-0.5 text-greyscale-500 hover:bg-greyscale-100 hover:text-greyscale-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function ConceptCardEditor({
  concept,
  onApplyDecision,
  onPreview,
  onSearchConcepts,
  onSetClassification,
  onRemoveClassification,
  onSetTags,
  onSetSubstitution,
  onRemoveSubstitution,
  onDone,
}: ConceptCardProps & { onDone: (message: string | null) => void }): ReactNode {
  const formId = useId();
  const [draft, setDraft] = useState<ConceptDraft>(() => draftOf(concept));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const impact = useImpactConfirmation(onPreview);
  const update = (changes: Partial<ConceptDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const [newName, setNewName] = useState<NameDraft | null>(null);
  const [isAddingParent, setIsAddingParent] = useState(false);
  const [parentType, setParentType] = useState<RelationshipType>("IS_A");
  const [newClassification, setNewClassification] = useState<{
    kind: ClassificationKind;
    text: string;
    value: ClassificationValue;
  } | null>(null);
  const [newSubstitute, setNewSubstitute] = useState<SubstitutionDraft | null>(
    null
  );

  const searchFoods = async (query: string): Promise<IngredientOption[]> =>
    ((await onSearchConcepts?.(query)) ?? [])
      .filter((option) => option.id !== concept.id)
      .map((option) => ({ id: option.id, name: option.canonicalName }));

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      const messages: string[] = [];
      const payload = conceptEditPayload(concept, draft);
      if (payload && onApplyDecision) {
        if (!(await impact.confirm(payload))) return;
        const result = await onApplyDecision(payload, null);
        if (!result.success) return setError(result.message);
        messages.push(result.data?.summary ?? "Saved names and relationships");
      }

      const stored = new Map(
        concept.classifications
          .filter((row) => row.isExplicit)
          .map((row) => [row.key, row.value])
      );
      const drafted = new Set(draft.classifications.map((row) => row.key));
      for (const key of stored.keys())
        if (!drafted.has(key) && onRemoveClassification) {
          const result = await onRemoveClassification(key);
          if (!result.success) return setError(result.message);
        }
      for (const row of draft.classifications)
        if (stored.get(row.key) !== row.value && onSetClassification) {
          const result = await onSetClassification({ ...row, note: null });
          if (!result.success) return setError(result.message);
        }

      if (onSetTags && draft.tags.join("\n") !== concept.tags.join("\n")) {
        const result = await onSetTags(draft.tags);
        if (!result.success) return setError(result.message);
      }

      const storedSubstitutes = new Map(
        concept.substitutions.map((row) => [row.concept.id, row])
      );
      const draftedSubstitutes = new Set(
        draft.substitutions.map((row) => row.conceptId)
      );
      for (const id of storedSubstitutes.keys())
        if (!draftedSubstitutes.has(id) && onRemoveSubstitution) {
          const result = await onRemoveSubstitution(id);
          if (!result.success) return setError(result.message);
        }
      for (const row of draft.substitutions) {
        const before = storedSubstitutes.get(row.conceptId);
        const ratio = row.ratio.trim() || null;
        const note = row.note.trim() || null;
        if (before && before.ratio === ratio && before.note === note) continue;
        if (!onSetSubstitution) continue;
        const result = await onSetSubstitution({
          substituteId: row.conceptId,
          ratio,
          note,
        });
        if (!result.success) return setError(result.message);
      }
      onDone(messages[0] ?? "Saved");
    } finally {
      setIsSaving(false);
    }
  }

  const explicitKeys = new Set(draft.classifications.map((row) => row.key));
  const inherited = concept.classifications.filter(
    (row) => !row.isExplicit && !explicitKeys.has(row.key)
  );
  const newClassificationKey = newClassification
    ? classificationKey(newClassification.kind, newClassification.text)
    : "";

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          aria-label={`Edit ${concept.canonicalName}`}
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${formId}-name`}
              className="text-sm font-semibold text-greyscale-900"
            >
              Main name
            </label>
            <UnderlineInput
              id={`${formId}-name`}
              value={draft.canonicalName}
              onChange={(event) =>
                update({ canonicalName: event.target.value })
              }
              fitContent
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <AddableLabel
                label="Names"
                addLabel="Add a name"
                canAdd={newName === null}
                onAdd={() => setNewName({ id: null, text: "", kind: "ALIAS" })}
              />
              <ul
                className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm"
                aria-label="Names"
              >
                {draft.names.map((name, index) => (
                  <li
                    key={name.id ?? `new-${index}`}
                    className="flex items-baseline gap-2"
                  >
                    <span className="font-medium text-greyscale-900">
                      {name.text}
                    </span>
                    <InlineSelect
                      aria-label={`Kind of name for ${name.text}`}
                      value={name.kind}
                      onChange={(event) =>
                        update({
                          names: draft.names.map((row, at) =>
                            at === index
                              ? { ...row, kind: event.target.value as NameKind }
                              : row
                          ),
                        })
                      }
                    >
                      {NAME_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {NAME_KIND_LABELS[kind]}
                        </option>
                      ))}
                    </InlineSelect>
                    <RemoveButton
                      label={`Remove the name ${name.text}`}
                      onClick={() =>
                        update({
                          names: draft.names.filter((_, at) => at !== index),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
              {newName ? (
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <UnderlineInput
                    aria-label="New name"
                    placeholder="add a name"
                    value={newName.text}
                    autoFocus
                    fitContent
                    onChange={(event) =>
                      setNewName({ ...newName, text: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      if (!newName.text.trim()) return;
                      update({
                        names: [
                          ...draft.names,
                          { ...newName, text: newName.text.trim() },
                        ],
                      });
                      setNewName(null);
                    }}
                  />
                  <InlineSelect
                    aria-label="Kind of the new name"
                    value={newName.kind}
                    onChange={(event) =>
                      setNewName({
                        ...newName,
                        kind: event.target.value as NameKind,
                      })
                    }
                  >
                    {NAME_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {NAME_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </InlineSelect>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!newName.text.trim()}
                    onClick={() => {
                      update({
                        names: [
                          ...draft.names,
                          { ...newName, text: newName.text.trim() },
                        ],
                      });
                      setNewName(null);
                    }}
                  >
                    Add name
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setNewName(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <AddableLabel
                label="More general"
                addLabel="Add a broader concept"
                canAdd={!isAddingParent}
                onAdd={() => setIsAddingParent(true)}
              />
              <ul
                className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm"
                aria-label="More general"
              >
                {draft.parents.map((parent, index) => (
                  <li
                    key={`${parent.targetId}|${parent.storedType ?? "new"}`}
                    className="flex items-baseline gap-2"
                  >
                    <span>{draft.canonicalName || concept.canonicalName}</span>
                    <InlineSelect
                      aria-label={`How ${concept.canonicalName} relates to ${parent.targetName}`}
                      value={parent.type}
                      onChange={(event) =>
                        update({
                          parents: draft.parents.map((row, at) =>
                            at === index
                              ? {
                                  ...row,
                                  type: event.target.value as RelationshipType,
                                }
                              : row
                          ),
                        })
                      }
                    >
                      {RELATIONSHIP_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {RELATIONSHIP_LABELS[type]}
                        </option>
                      ))}
                    </InlineSelect>
                    <span className="font-medium text-greyscale-900">
                      {parent.targetName}
                    </span>
                    <RemoveButton
                      label={`Remove the broader concept ${parent.targetName}`}
                      onClick={() =>
                        update({
                          parents: draft.parents.filter(
                            (_, at) => at !== index
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
              {isAddingParent ? (
                <div className="flex flex-col gap-2 text-sm">
                  <span className="flex items-baseline gap-2">
                    {concept.canonicalName}
                    <InlineSelect
                      aria-label="Relationship to the broader concept"
                      value={parentType}
                      onChange={(event) =>
                        setParentType(event.target.value as RelationshipType)
                      }
                    >
                      {RELATIONSHIP_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {RELATIONSHIP_LABELS[type]}
                        </option>
                      ))}
                    </InlineSelect>
                  </span>
                  <IngredientPicker
                    label="Broader concept"
                    selected={[]}
                    onChange={([picked]) => {
                      if (!picked) return;
                      update({
                        parents: [
                          ...draft.parents,
                          {
                            targetId: picked.id,
                            targetName: picked.name,
                            type: parentType,
                            storedType: null,
                          },
                        ],
                      });
                      setIsAddingParent(false);
                    }}
                    onSearch={searchFoods}
                    excludeIds={draft.parents.map((parent) => parent.targetId)}
                    limit={5}
                    autoFocus
                    onDismiss={() => setIsAddingParent(false)}
                  />
                </div>
              ) : null}
              <h3 className="mt-2 text-sm font-semibold text-greyscale-900">
                More specific
              </h3>
              <RelationshipLines
                name={concept.canonicalName}
                edges={concept.children}
                direction="child"
              />
              <p className="text-xs text-greyscale-600">
                Narrower concepts are edited on their own pages.
              </p>
            </div>

            {onSetClassification || onRemoveClassification ? (
              <div className="flex flex-col gap-2">
                <AddableLabel
                  label="Classifications"
                  addLabel="Add a classification"
                  canAdd={
                    newClassification === null && Boolean(onSetClassification)
                  }
                  onAdd={() =>
                    setNewClassification({
                      kind: "DIETARY",
                      text: "",
                      value: "TRUE",
                    })
                  }
                />
                <ul
                  className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm"
                  aria-label="Classifications"
                >
                  {draft.classifications.map((row, index) => (
                    <li key={row.key} className="flex items-baseline gap-2">
                      <span className="font-medium">
                        {classificationLabel(row.key)}
                      </span>
                      <span className="text-greyscale-600">
                        ({CLASSIFICATION_KIND_LABELS[row.kind] ?? row.kind})
                      </span>
                      <InlineSelect
                        aria-label={`Value of ${classificationLabel(row.key)}`}
                        value={row.value}
                        onChange={(event) =>
                          update({
                            classifications: draft.classifications.map(
                              (item, at) =>
                                at === index
                                  ? {
                                      ...item,
                                      value: event.target
                                        .value as ClassificationValue,
                                    }
                                  : item
                            ),
                          })
                        }
                      >
                        {CLASSIFICATION_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {CLASSIFICATION_VALUE_LABELS[value]}
                          </option>
                        ))}
                      </InlineSelect>
                      {onRemoveClassification ? (
                        <RemoveButton
                          label={`Remove ${classificationLabel(row.key)}`}
                          onClick={() =>
                            update({
                              classifications: draft.classifications.filter(
                                (_, at) => at !== index
                              ),
                            })
                          }
                        />
                      ) : null}
                    </li>
                  ))}
                  {inherited.map((row) => (
                    <li key={row.key} className="text-greyscale-600">
                      {classificationLabel(row.key)}:{" "}
                      {CLASSIFICATION_VALUE_LABELS[
                        row.value as ClassificationValue
                      ] ?? row.value}
                      {row.inheritedFrom ? (
                        <> (inherited from {row.inheritedFrom.canonicalName})</>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {newClassification ? (
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <InlineSelect
                      aria-label="Kind of classification"
                      value={newClassification.kind}
                      onChange={(event) =>
                        setNewClassification({
                          ...newClassification,
                          kind: event.target.value as ClassificationKind,
                        })
                      }
                    >
                      {CLASSIFICATION_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {CLASSIFICATION_KIND_LABELS[kind]}
                        </option>
                      ))}
                    </InlineSelect>
                    <UnderlineInput
                      aria-label="Classification name"
                      placeholder={
                        newClassification.kind === "CATEGORY"
                          ? "Spices"
                          : "vegan"
                      }
                      value={newClassification.text}
                      fitContent
                      autoFocus
                      onChange={(event) =>
                        setNewClassification({
                          ...newClassification,
                          text: event.target.value,
                        })
                      }
                    />
                    <InlineSelect
                      aria-label="Classification value"
                      value={newClassification.value}
                      onChange={(event) =>
                        setNewClassification({
                          ...newClassification,
                          value: event.target.value as ClassificationValue,
                        })
                      }
                    >
                      {CLASSIFICATION_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {CLASSIFICATION_VALUE_LABELS[value]}
                        </option>
                      ))}
                    </InlineSelect>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!newClassificationKey}
                      onClick={() => {
                        update({
                          classifications: [
                            ...draft.classifications.filter(
                              (row) => row.key !== newClassificationKey
                            ),
                            {
                              key: newClassificationKey,
                              kind: newClassification.kind,
                              value: newClassification.value,
                            },
                          ],
                        });
                        setNewClassification(null);
                      }}
                    >
                      Add classification
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setNewClassification(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {onSetTags ? (
              <div className="flex flex-col gap-2">
                <ChipInput
                  id={`${formId}-tags`}
                  label="Tags"
                  values={draft.tags}
                  onChange={(tags) => update({ tags })}
                  placeholder="add tag"
                  variant="underline"
                  addLabel="Add a tag"
                />
              </div>
            ) : null}

            {onSetSubstitution || onRemoveSubstitution ? (
              <div className="flex flex-col gap-2">
                <AddableLabel
                  label="Substitutions"
                  addLabel="Add a substitution"
                  canAdd={newSubstitute === null && Boolean(onSetSubstitution)}
                  onAdd={() =>
                    setNewSubstitute({
                      conceptId: "",
                      name: "",
                      ratio: "",
                      note: "",
                    })
                  }
                />
                <ul
                  className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm"
                  aria-label="Substitutions"
                >
                  {draft.substitutions.map((row, index) => (
                    <li
                      key={row.conceptId}
                      className="flex flex-wrap items-baseline gap-2"
                    >
                      <span className="font-medium text-greyscale-900">
                        {row.name}
                      </span>
                      <UnderlineInput
                        aria-label={`Ratio for ${row.name}`}
                        placeholder="ratio"
                        value={row.ratio}
                        fitContent
                        onChange={(event) =>
                          update({
                            substitutions: draft.substitutions.map(
                              (item, at) =>
                                at === index
                                  ? { ...item, ratio: event.target.value }
                                  : item
                            ),
                          })
                        }
                      />
                      <UnderlineInput
                        aria-label={`Note for ${row.name}`}
                        placeholder="note"
                        value={row.note}
                        fitContent
                        onChange={(event) =>
                          update({
                            substitutions: draft.substitutions.map(
                              (item, at) =>
                                at === index
                                  ? { ...item, note: event.target.value }
                                  : item
                            ),
                          })
                        }
                      />
                      {onRemoveSubstitution ? (
                        <RemoveButton
                          label={`Remove the substitute ${row.name}`}
                          onClick={() =>
                            update({
                              substitutions: draft.substitutions.filter(
                                (_, at) => at !== index
                              ),
                            })
                          }
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
                {newSubstitute ? (
                  <IngredientPicker
                    label="Substitute"
                    selected={[]}
                    onChange={([picked]) => {
                      if (!picked) return;
                      update({
                        substitutions: [
                          ...draft.substitutions,
                          {
                            conceptId: picked.id,
                            name: picked.name,
                            ratio: "",
                            note: "",
                          },
                        ],
                      });
                      setNewSubstitute(null);
                    }}
                    onSearch={searchFoods}
                    excludeIds={draft.substitutions.map((row) => row.conceptId)}
                    limit={5}
                    autoFocus
                    onDismiss={() => setNewSubstitute(null)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <InlineError message={error} />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onDone(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || impact.isChecking}>
              {impact.isChecking ? "Checking…" : isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
          {impact.dialog}
        </form>
      </CardContent>
    </Card>
  );
}

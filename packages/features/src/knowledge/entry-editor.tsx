"use client";

import { type ReactNode, useId, useState } from "react";

import { Button, InlineSelect, UnderlineInput } from "@peas/components";

import { IngredientPicker } from "../ingredients/components/ingredient-picker";
import type { IngredientOption } from "../ingredients/types";
import { InlineError, type MutationAction, useMutation } from "../shared";
import { useImpactConfirmation } from "../teach/impact-confirmation";
import type {
  ApplyDecisionResult,
  DecisionPayload,
  PreviewDecision,
  SearchConcepts,
  TeachVocabulary,
} from "../teach/types";

export const ENTRY_ROLES = [
  "FOOD",
  "ATTRIBUTE",
  "PREPARATION",
  "DEGREE",
  "MEASUREMENT_MODIFIER",
  "INSTRUCTION",
] as const;
export type EntryRole = (typeof ENTRY_ROLES)[number];

export const ENTRY_ROLE_LABELS: Record<EntryRole, string> = {
  FOOD: "food name",
  ATTRIBUTE: "attribute",
  PREPARATION: "preparation",
  DEGREE: "degree",
  MEASUREMENT_MODIFIER: "measure word",
  INSTRUCTION: "instruction",
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

const ENTRY_STATUSES = ["ACTIVE", "PROPOSED", "DEPRECATED"] as const;
type EntryStatus = (typeof ENTRY_STATUSES)[number];

const STATUS_LABELS: Record<EntryStatus, string> = {
  ACTIVE: "active",
  PROPOSED: "proposed",
  DEPRECATED: "retired",
};

/** An entry as the editor works on it; `target` is the concept, attribute value, or preparation id, or the value key, depending on the role. */
export interface EntryDraft {
  text: string;
  role: EntryRole;
  target: string;
  /** The food's name for display when the target is a concept. */
  targetLabel: string;
  kind: NameKind;
  status: EntryStatus;
}

/** Everything the lexicon page needs to edit entries; leave it out for a read-only page. */
export interface LexiconEditing {
  vocabulary: TeachVocabulary;
  onApplyDecision: MutationAction<
    [payload: DecisionPayload, discoveryId: string | null],
    ApplyDecisionResult
  >;
  onPreview?: PreviewDecision;
  onSearchConcepts: SearchConcepts;
}

/** The value keys a modifier role can point at, keeping a stored key the vocabulary no longer lists. */
function valueKeysFor(
  role: EntryRole,
  vocabulary: TeachVocabulary,
  current: string
): string[] {
  const keys =
    role === "DEGREE"
      ? vocabulary.degreeKeys
      : role === "MEASUREMENT_MODIFIER"
        ? vocabulary.measurementModifierKeys
        : role === "INSTRUCTION"
          ? vocabulary.instructionKeys
          : [];
  return current && !keys.includes(current) ? [current, ...keys] : keys;
}

/** The first target a role offers, used when the role changes. */
function defaultTarget(role: EntryRole, vocabulary: TeachVocabulary): string {
  if (role === "ATTRIBUTE") return vocabulary.attributeValues[0]?.id ?? "";
  if (role === "PREPARATION") return vocabulary.preparations[0]?.id ?? "";
  if (role === "FOOD") return "";
  return valueKeysFor(role, vocabulary, "")[0] ?? "";
}

/**
 * The EDIT_ENTRY decision for an edited entry.
 *
 * @example
 * editEntryPayload(entryId, { text: "finely", role: "DEGREE", target: "fine", status: "DEPRECATED", ... })
 * // { type: "EDIT_ENTRY", entryId, text: "finely", role: "DEGREE", valueKey: "fine", status: "DEPRECATED" }
 */
export function editEntryPayload(
  entryId: string,
  draft: EntryDraft
): DecisionPayload {
  return {
    type: "EDIT_ENTRY",
    entryId,
    text: draft.text.trim(),
    role: draft.role,
    status: draft.status,
    ...targetFields(draft),
  };
}

/**
 * The decision that adds a new entry: MAP_TO_CONCEPT for a food name (it also adds a generated plural), CLASSIFY_MODIFIER for everything else.
 *
 * @example
 * newEntryPayload({ text: "roughly", role: "DEGREE", target: "rough", ... }) // { type: "CLASSIFY_MODIFIER", token: "roughly", role: "DEGREE", valueKey: "rough" }
 */
export function newEntryPayload(draft: EntryDraft): DecisionPayload {
  const text = draft.text.trim();
  if (draft.role === "FOOD")
    return {
      type: "MAP_TO_CONCEPT",
      phrase: text,
      conceptId: draft.target,
      kind: draft.kind,
    };
  return {
    type: "CLASSIFY_MODIFIER",
    token: text,
    role: draft.role,
    ...targetFields(draft),
  };
}

function targetFields(draft: EntryDraft) {
  switch (draft.role) {
    case "FOOD":
      return { conceptId: draft.target, kind: draft.kind };
    case "ATTRIBUTE":
      return { attributeValueId: draft.target };
    case "PREPARATION":
      return { preparationId: draft.target };
    default:
      return { valueKey: draft.target };
  }
}

interface EntryEditorProps {
  /** The entry being edited, or null to add a new one. */
  entryId: string | null;
  initial: EntryDraft;
  editing: LexiconEditing;
  onDone: (message: string | null) => void;
}

/**
 * One lexicon entry as an editable sentence: "[text] is a [role] meaning [target], [status]". Saving previews the change and asks first when stored mentions would read differently.
 */
export function EntryEditor({
  entryId,
  initial,
  editing,
  onDone,
}: EntryEditorProps): ReactNode {
  const formId = useId();
  const [draft, setDraft] = useState<EntryDraft>(initial);
  const impact = useImpactConfirmation(editing.onPreview);
  const apply = useMutation(editing.onApplyDecision);
  const { vocabulary } = editing;
  const isNew = entryId === null;
  const update = (changes: Partial<EntryDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const canSave = draft.text.trim().length > 0 && draft.target.length > 0;

  async function handleSave() {
    if (!canSave) return;
    const payload = isNew
      ? newEntryPayload(draft)
      : editEntryPayload(entryId, draft);
    if (!(await impact.confirm(payload))) return;
    const result = await apply.run(payload, null);
    if (result.success) onDone(result.data?.summary ?? "Saved");
  }

  const searchFoods = async (query: string): Promise<IngredientOption[]> =>
    (await editing.onSearchConcepts(query)).map((concept) => ({
      id: concept.id,
      name: concept.canonicalName,
    }));

  const label = isNew ? "New lexicon entry" : `Edit “${initial.text}”`;
  return (
    <form
      aria-label={label}
      className="flex flex-col gap-3 rounded-md bg-greyscale-50 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-sm text-greyscale-800">
        <UnderlineInput
          id={`${formId}-text`}
          aria-label="Text"
          value={draft.text}
          placeholder="text"
          fitContent
          onChange={(event) => update({ text: event.target.value })}
        />
        <span>is a</span>
        <InlineSelect
          aria-label="Role"
          value={draft.role}
          onChange={(event) => {
            const role = event.target.value as EntryRole;
            update({
              role,
              target: defaultTarget(role, vocabulary),
              targetLabel: "",
            });
          }}
        >
          {ENTRY_ROLES.map((role) => (
            <option key={role} value={role}>
              {ENTRY_ROLE_LABELS[role]}
            </option>
          ))}
        </InlineSelect>
        {draft.role === "FOOD" ? (
          <>
            <span>for</span>
            {draft.target ? (
              <span className="inline-flex items-baseline gap-1">
                <span className="font-medium text-greyscale-900">
                  {draft.targetLabel}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  aria-label={`Change the food (now ${draft.targetLabel})`}
                  onClick={() => update({ target: "", targetLabel: "" })}
                >
                  change
                </Button>
              </span>
            ) : (
              <span className="min-w-48">
                <IngredientPicker
                  label="Food"
                  selected={[]}
                  onChange={([picked]) =>
                    picked &&
                    update({ target: picked.id, targetLabel: picked.name })
                  }
                  onSearch={searchFoods}
                  limit={5}
                  autoFocus={!isNew}
                />
              </span>
            )}
            <span>as its</span>
            <InlineSelect
              aria-label="Kind of name"
              value={draft.kind}
              onChange={(event) =>
                update({ kind: event.target.value as NameKind })
              }
            >
              {NAME_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {NAME_KIND_LABELS[kind]}
                </option>
              ))}
            </InlineSelect>
          </>
        ) : (
          <>
            <span>meaning</span>
            <InlineSelect
              aria-label="Meaning"
              value={draft.target}
              onChange={(event) => update({ target: event.target.value })}
            >
              {draft.role === "ATTRIBUTE"
                ? vocabulary.attributeValues.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.definitionKey}: {value.label}
                    </option>
                  ))
                : draft.role === "PREPARATION"
                  ? vocabulary.preparations.map((preparation) => (
                      <option key={preparation.id} value={preparation.id}>
                        {preparation.label}
                      </option>
                    ))
                  : valueKeysFor(draft.role, vocabulary, draft.target).map(
                      (key) => (
                        <option key={key} value={key}>
                          {key.replace(/_/g, " ")}
                        </option>
                      )
                    )}
            </InlineSelect>
          </>
        )}
        {isNew ? null : (
          <>
            <span>,</span>
            <InlineSelect
              aria-label="Status"
              value={draft.status}
              onChange={(event) =>
                update({ status: event.target.value as EntryStatus })
              }
            >
              {ENTRY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </InlineSelect>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={!canSave || apply.isPending || impact.isChecking}
        >
          {impact.isChecking
            ? "Checking…"
            : apply.isPending
              ? "Saving…"
              : isNew
                ? "Add entry"
                : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onDone(null)}
        >
          Cancel
        </Button>
      </div>
      <InlineError message={apply.error} />
      {impact.dialog}
    </form>
  );
}

"use client";

import type {
  ClassificationInput,
  ClassificationKind,
  ClassificationValue,
  ConceptClassificationRow,
  ConceptEditActions,
  ConceptSubstitution,
} from "./types";

import { type ReactNode, useId, useState } from "react";

import { Button, Input, Label } from "@peas/components";

import { AppLink } from "../app-navigation";
import { InlineError, RemovableList, useMutation } from "../shared";
import { ConceptPicker } from "../teach/concept-picker";
import type { ConceptRef, SearchConcepts } from "../teach/types";

const KIND_LABELS: Record<ClassificationKind, string> = {
  DIETARY: "Dietary property",
  FOOD_GROUP: "Food group",
  ALLERGEN: "Allergen",
  CATEGORY: "Category",
  CERTIFICATION: "Certification",
};
const KINDS = Object.keys(KIND_LABELS) as ClassificationKind[];

const VALUE_LABELS: Record<ClassificationValue, string> = {
  TRUE: "yes",
  FALSE: "no",
  UNKNOWN: "unknown",
};
const VALUES = Object.keys(VALUE_LABELS) as ClassificationValue[];

const selectClassName =
  "h-9 rounded-md border border-greyscale-300 bg-white px-2 text-sm";

/**
 * The stored key for a classification typed into the form: categories keep their spelling behind a CATEGORY: prefix, other keys become upper snake case.
 *
 * @example
 * classificationKey("CATEGORY", "Baking Spices") // "CATEGORY:Baking Spices"
 * classificationKey("DIETARY", "gluten free")    // "GLUTEN_FREE"
 */
export function classificationKey(
  kind: ClassificationKind,
  text: string
): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return kind === "CATEGORY"
    ? `CATEGORY:${trimmed}`
    : trimmed.toUpperCase().replace(/[\s-]+/g, "_");
}

/** "CATEGORY:Spices" reads as "Spices"; "GLUTEN_FREE" as "gluten free". */
export function classificationLabel(key: string): string {
  return key.startsWith("CATEGORY:")
    ? key.slice("CATEGORY:".length)
    : key.replace(/_/g, " ").toLowerCase();
}

function SuccessMessage({ message }: { message: string | null }): ReactNode {
  return message ? (
    <p role="status" className="text-sm text-success-900">
      {message}
    </p>
  ) : null;
}

/**
 * Effective classifications (inherited ones link to their source) with remove buttons on explicit values and a form to set one. Without actions the list is read-only.
 */
export function ClassificationEditor({
  classifications,
  onSetClassification,
  onRemoveClassification,
}: {
  classifications: ConceptClassificationRow[];
} & Pick<
  ConceptEditActions,
  "onSetClassification" | "onRemoveClassification"
>): ReactNode {
  const kindId = useId();
  const keyId = useId();
  const valueId = useId();
  const [kind, setKind] = useState<ClassificationKind>("DIETARY");
  const [text, setText] = useState("");
  const [value, setValue] = useState<ClassificationValue>("TRUE");
  const [message, setMessage] = useState<string | null>(null);
  const save = useMutation(onSetClassification);
  const remove = useMutation(onRemoveClassification);
  const key = classificationKey(kind, text);

  async function handleSave() {
    if (!key) return;
    const input: ClassificationInput = { kind, key, value, note: null };
    const result = await save.run(input);
    if (result.success) {
      setText("");
      setMessage(`Set ${classificationLabel(key)} to ${VALUE_LABELS[value]}`);
    }
  }

  async function handleRemove(rowKey: string) {
    const result = await remove.run(rowKey);
    if (result.success) setMessage(`Removed ${classificationLabel(rowKey)}`);
  }

  return (
    <div className="flex flex-col gap-3">
      {classifications.length === 0 ? (
        <p className="text-sm text-greyscale-600">No classifications.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {classifications.map((row) => (
            <li key={row.key} className="flex flex-wrap items-center gap-1">
              <span className="font-medium">
                {classificationLabel(row.key)}
              </span>
              <span className="text-greyscale-600">
                ({KIND_LABELS[row.kind as ClassificationKind]?.toLowerCase() ??
                  row.kind.toLowerCase()})
              </span>
              : {VALUE_LABELS[row.value as ClassificationValue] ?? row.value}
              {row.source === "INHERITED" && row.inheritedFrom ? (
                <span className="text-greyscale-600">
                  (inherited from{" "}
                  <AppLink
                    href={`/concepts/${row.inheritedFrom.id}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {row.inheritedFrom.canonicalName}
                  </AppLink>
                  )
                </span>
              ) : row.source === "CONFLICT" ? (
                <span className="text-error-700">(conflicting parents)</span>
              ) : null}
              {row.isExplicit && onRemoveClassification ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  aria-label={`Remove ${classificationLabel(row.key)}`}
                  disabled={remove.isPending}
                  onClick={() => void handleRemove(row.key)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <InlineError message={remove.error} />
      {onSetClassification ? (
        <form
          className="flex flex-col gap-2 rounded-md border border-greyscale-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <h3 className="text-sm font-semibold">Set a classification</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor={kindId}>Kind</Label>
              <select
                id={kindId}
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as ClassificationKind)
                }
                className={selectClassName}
              >
                {KINDS.map((option) => (
                  <option key={option} value={option}>
                    {KIND_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={keyId}>
                {kind === "CATEGORY" ? "Category name" : "Name"}
              </Label>
              <Input
                id={keyId}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={kind === "CATEGORY" ? "Spices" : "vegan"}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={valueId}>Value</Label>
              <select
                id={valueId}
                value={value}
                onChange={(event) =>
                  setValue(event.target.value as ClassificationValue)
                }
                className={selectClassName}
              >
                {VALUES.map((option) => (
                  <option key={option} value={option}>
                    {VALUE_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="self-start"
            disabled={!key || save.isPending}
          >
            {save.isPending ? "Saving…" : "Save classification"}
          </Button>
          <InlineError message={save.error} />
        </form>
      ) : null}
      <SuccessMessage message={message} />
    </div>
  );
}

/**
 * Free-form tags, e.g. "pantry" or "baking". Each add or remove saves the whole list.
 */
export function TagEditor({
  tags,
  onSetTags,
}: { tags: string[] } & Pick<ConceptEditActions, "onSetTags">): ReactNode {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const save = useMutation(onSetTags);

  async function saveTags(next: string[]) {
    return save.run(next);
  }

  async function handleAdd() {
    const tag = draft.trim();
    if (!tag) return;
    const exists = tags.some((name) => name.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    const result = await saveTags([...tags, tag]);
    if (result.success) setDraft("");
  }

  if (!onSetTags) {
    return tags.length === 0 ? (
      <p className="text-sm text-greyscale-600">No tags.</p>
    ) : (
      <ul className="flex flex-wrap gap-1 text-sm" aria-label="Tags">
        {tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-greyscale-100 px-2 py-0.5 text-greyscale-800"
          >
            {tag}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length === 0 ? (
        <p className="text-sm text-greyscale-600">No tags.</p>
      ) : (
        <RemovableList
          label="Tags"
          items={tags.map((tag) => ({ key: tag, label: tag }))}
          onRemove={(removed) =>
            void saveTags(tags.filter((tag) => tag !== removed))
          }
        />
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={inputId}>Add a tag</Label>
          <Input
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="pantry"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={!draft.trim() || save.isPending}
        >
          {save.isPending ? "Saving…" : "Add tag"}
        </Button>
      </form>
      <InlineError message={save.error} />
    </div>
  );
}

/**
 * Concepts that can stand in for this one, with an optional ratio and note, plus a form that adds one.
 */
export function SubstitutionEditor({
  substitutions,
  onSetSubstitution,
  onRemoveSubstitution,
  onSearchConcepts,
}: {
  substitutions: ConceptSubstitution[];
  onSearchConcepts?: SearchConcepts;
} & Pick<
  ConceptEditActions,
  "onSetSubstitution" | "onRemoveSubstitution"
>): ReactNode {
  const ratioId = useId();
  const noteId = useId();
  const [substitute, setSubstitute] = useState<ConceptRef | null>(null);
  const [ratio, setRatio] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const save = useMutation(onSetSubstitution);
  const remove = useMutation(onRemoveSubstitution);

  async function handleAdd() {
    if (!substitute) return;
    const result = await save.run({
      substituteId: substitute.id,
      ratio: ratio.trim() || null,
      note: note.trim() || null,
    });
    if (result.success) {
      setMessage(`Added ${substitute.canonicalName}`);
      setSubstitute(null);
      setRatio("");
      setNote("");
    }
  }

  async function handleRemove(row: ConceptSubstitution) {
    const result = await remove.run(row.concept.id);
    if (result.success) setMessage(`Removed ${row.concept.canonicalName}`);
  }

  return (
    <div className="flex flex-col gap-3">
      {substitutions.length === 0 ? (
        <p className="text-sm text-greyscale-600">No substitutions.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm" aria-label="Substitutions">
          {substitutions.map((row) => (
            <li key={row.concept.id} className="flex flex-wrap items-center gap-1">
              <AppLink
                href={`/concepts/${row.concept.id}`}
                className="text-primary underline underline-offset-2"
              >
                {row.concept.canonicalName}
              </AppLink>
              {row.ratio ? (
                <span className="text-greyscale-700">({row.ratio})</span>
              ) : null}
              {row.note ? (
                <span className="text-greyscale-600">: {row.note}</span>
              ) : null}
              {onRemoveSubstitution ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  aria-label={`Remove ${row.concept.canonicalName}`}
                  disabled={remove.isPending}
                  onClick={() => void handleRemove(row)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <InlineError message={remove.error} />
      {onSetSubstitution && onSearchConcepts ? (
        <form
          className="flex flex-col gap-2 rounded-md border border-greyscale-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAdd();
          }}
        >
          <h3 className="text-sm font-semibold">Add a substitution</h3>
          <ConceptPicker
            label="Substitute"
            value={substitute}
            onChange={setSubstitute}
            onSearch={onSearchConcepts}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={ratioId}>Ratio (optional)</Label>
              <Input
                id={ratioId}
                value={ratio}
                onChange={(event) => setRatio(event.target.value)}
                placeholder="3/4 cup per cup"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={noteId}>Note (optional)</Label>
              <Input
                id={noteId}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="best for baking"
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="self-start"
            disabled={!substitute || save.isPending}
          >
            {save.isPending ? "Adding…" : "Add substitution"}
          </Button>
          <InlineError message={save.error} />
        </form>
      ) : null}
      <SuccessMessage message={message} />
    </div>
  );
}

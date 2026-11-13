"use client";

import { AddableLabel } from "./addable-label";
import { RemovableList } from "./removable-list";

import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Badge, Input, Label, UnderlineInput } from "@peas/components";
import { X } from "lucide-react";

interface ChipInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  description?: string;
  /** `underline` shows entries as a plain list above a borderless input. */
  variant?: "outlined" | "underline";
  /** Show only the label and a plus button (named by this); the input appears when the button is used. */
  addLabel?: string;
  /** Read-only entries shown before the editable ones, e.g. tags added automatically. */
  fixedValues?: string[];
  /** Explains the fixed entries, e.g. "Added automatically from the properties". */
  fixedValuesDescription?: string;
  /** Checks an entry before it is added; return a message to refuse it. */
  validate?: (value: string) => string | null | Promise<string | null>;
  /** Suggestions offered while typing (an HTML datalist). */
  suggestions?: string[];
}

/**
 * Free-text list editor: Enter or comma adds an entry, each chip can be removed.
 */
export function ChipInput({
  id,
  label,
  values,
  onChange,
  placeholder,
  description,
  variant = "outlined",
  addLabel,
  fixedValues = [],
  fixedValuesDescription,
  validate,
  suggestions,
}: ChipInputProps): ReactNode {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = `${id}-error`;
  const suggestionsId = suggestions ? `${id}-suggestions` : undefined;
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCollapsed = addLabel !== undefined && !isAdding;

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);
  const descriptionId = description ? `${id}-description` : undefined;
  const isUnderline = variant === "underline";

  /** Adds the draft's entries; resolves false when validation refused one (the draft stays for fixing). */
  async function commitDraft(): Promise<boolean> {
    const additions = draft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (additions.length === 0) return true;

    const existing = new Set(values.map((value) => value.toLowerCase()));
    const unique = additions.filter(
      (value) => !existing.has(value.toLowerCase())
    );
    for (const value of unique) {
      const problem = validate ? await validate(value) : null;
      if (problem) {
        setError(problem);
        return false;
      }
    }
    setError(null);
    onChange([...values, ...unique]);
    setDraft("");
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      void commitDraft();
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  const removeValue = (value: string) =>
    onChange(values.filter((item) => item !== value));
  const inputProps = {
    id,
    value: draft,
    placeholder,
    list: suggestionsId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby":
      [descriptionId, error ? errorId : undefined].filter(Boolean).join(" ") ||
      undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setDraft(event.target.value);
      setError(null);
    },
    onKeyDown: handleKeyDown,
    onBlur: () => {
      void commitDraft().then((isAdded) => {
        if (isAdded) setIsAdding(false);
      });
    },
  };

  return (
    <div
      className={isUnderline ? "flex flex-col gap-1" : "flex flex-col gap-2"}
    >
      {addLabel ? (
        <AddableLabel
          label={label}
          htmlFor={isCollapsed ? undefined : id}
          addLabel={addLabel}
          canAdd={isCollapsed}
          onAdd={() => setIsAdding(true)}
        />
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      {fixedValues.length > 0 ? (
        <ul
          aria-label={`${label} added automatically`}
          aria-describedby={
            fixedValuesDescription ? `${id}-fixed-description` : undefined
          }
          className="flex flex-wrap gap-1"
        >
          {fixedValues.map((value) => (
            <li
              key={value}
              className="rounded-sm bg-secondary-50 px-1.5 py-0.5 text-xs text-secondary-700"
            >
              {value}
            </li>
          ))}
        </ul>
      ) : null}
      {fixedValues.length > 0 && fixedValuesDescription ? (
        <p id={`${id}-fixed-description`} className="sr-only">
          {fixedValuesDescription}
        </p>
      ) : null}
      {isUnderline ? (
        <RemovableList
          label={label}
          items={values.map((value) => ({ key: value, label: value }))}
          onRemove={removeValue}
        />
      ) : values.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-label={label}>
          {values.map((value) => (
            <li key={value}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {value}
                <button
                  type="button"
                  onClick={() => removeValue(value)}
                  aria-label={`Remove ${value}`}
                  className="rounded-sm p-0.5 hover:bg-greyscale-200"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {isCollapsed ? null : isUnderline ? (
        <UnderlineInput ref={inputRef} className="text-sm" {...inputProps} />
      ) : (
        <Input ref={inputRef} {...inputProps} />
      )}
      {suggestions && !isCollapsed ? (
        <datalist id={suggestionsId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-error-700">
          {error}
        </p>
      ) : null}
      {description ? (
        <p id={descriptionId} className="text-xs text-greyscale-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}

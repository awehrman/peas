"use client";

import { type KeyboardEvent, type ReactNode, useState } from "react";

import { Badge, Input, Label } from "@peas/components";
import { X } from "lucide-react";

interface ChipInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  description?: string;
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
}: ChipInputProps): ReactNode {
  const [draft, setDraft] = useState("");
  const descriptionId = description ? `${id}-description` : undefined;

  function commitDraft() {
    const additions = draft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (additions.length === 0) return;

    const existing = new Set(values.map((value) => value.toLowerCase()));
    const unique = additions.filter((value) => !existing.has(value.toLowerCase()));
    onChange([...values, ...unique]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-label={label}>
          {values.map((value) => (
            <li key={value}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {value}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((item) => item !== value))}
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
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        aria-describedby={descriptionId}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
      />
      {description ? (
        <p id={descriptionId} className="text-xs text-greyscale-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}

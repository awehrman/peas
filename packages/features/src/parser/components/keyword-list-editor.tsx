"use client";

import { type KeyboardEvent, type ReactNode, useState } from "react";

import { Button, Input, Label } from "@peas/components";
import { X } from "lucide-react";

import { formatKeywordList } from "../utils/keyword-list";

interface KeywordListEditorProps {
  id: string;
  list: string[];
  onChange: (list: string[]) => void;
}

/**
 * Edits a LIST definition. Bare words are quoted as case-insensitive
 * literals; comma- or slash-separated input adds several at once.
 */
export function KeywordListEditor({ id, list, onChange }: KeywordListEditorProps): ReactNode {
  const [draft, setDraft] = useState("");

  function addKeywords() {
    if (!draft.trim()) return;
    onChange(formatKeywordList(draft, list));
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addKeywords();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Keywords</Label>
      {list.length > 0 ? (
        <ul className="flex flex-wrap gap-1 font-mono text-sm" aria-label="Keywords">
          {list.map((keyword) => (
            <li
              key={keyword}
              className="flex items-center gap-1 rounded border bg-greyscale-50 px-1.5 py-0.5"
            >
              {keyword}
              <button
                type="button"
                aria-label={`Remove keyword ${keyword}`}
                className="rounded-sm p-0.5 hover:bg-greyscale-200"
                onClick={() => onChange(list.filter((item) => item !== keyword))}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder="cup, cups, c"
          aria-describedby={`${id}-help`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          className="font-mono"
        />
        <Button type="button" variant="outline" onClick={addKeywords} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      <p id={`${id}-help`} className="text-xs text-greyscale-600">
        Separate entries with commas or slashes. Longer keywords are tried first.
      </p>
    </div>
  );
}

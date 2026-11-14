"use client";

import type { ReactNode } from "react";

import { Label } from "@peas/components";
import { Plus } from "lucide-react";

interface AddableLabelProps {
  label: string;
  /** The input the label names, when it is rendered. */
  htmlFor?: string;
  /** Names the label for a group instead (`aria-labelledby`). */
  id?: string;
  /** The plus button's accessible name, e.g. "Add an alternate name". */
  addLabel: string;
  /** Shows the plus button; hide it once the input is showing. */
  canAdd: boolean;
  onAdd: () => void;
}

/**
 * A field label with a small plus button beside it, for list fields that stay collapsed until there is something to add.
 *
 * @example
 * <AddableLabel label="Tags" htmlFor="tags" addLabel="Add a tag" canAdd={!isAdding} onAdd={() => setIsAdding(true)} />
 */
export function AddableLabel({
  label,
  htmlFor,
  id,
  addLabel,
  canAdd,
  onAdd,
}: AddableLabelProps): ReactNode {
  return (
    <div className="flex items-center gap-1.5">
      {htmlFor ? (
        <Label id={id} htmlFor={htmlFor} className="font-semibold">
          {label}
        </Label>
      ) : (
        <span id={id} className="text-sm font-semibold leading-none">
          {label}
        </span>
      )}
      {canAdd ? (
        <button
          type="button"
          aria-label={addLabel}
          onClick={onAdd}
          className="rounded-sm p-0.5 text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

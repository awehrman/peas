"use client";

import type { ReactNode } from "react";

import { X } from "lucide-react";

export interface RemovableListItem {
  key: string;
  label: string;
}

interface RemovableListProps {
  label: string;
  items: RemovableListItem[];
  onRemove: (key: string) => void;
}

/**
 * Plain stacked list of entries, each with a small remove button.
 */
export function RemovableList({
  label,
  items,
  onRemove,
}: RemovableListProps): ReactNode {
  if (items.length === 0) return null;

  return (
    <ul
      className="flex max-h-32 flex-col overflow-y-auto text-sm"
      aria-label={label}
    >
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1 py-0.5">
          <span className="min-w-0 truncate">{item.label}</span>
          <button
            type="button"
            aria-label={`Remove ${item.label}`}
            className="rounded-sm p-0.5 text-greyscale-600 hover:text-error-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onRemove(item.key)}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

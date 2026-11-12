import type { ConceptEntry } from "./types";

import type { ReactNode } from "react";

import { Badge } from "@peas/components";

const KIND_LABELS: Record<string, string> = {
  CANONICAL: "Canonical name",
  PLURAL: "Plurals",
  ALIAS: "Aliases",
  REGIONAL: "Regional names",
  ABBREVIATION: "Abbreviations",
  VARIANT: "Variants",
  OTHER: "Other",
};

/**
 * A concept's lexicon entries grouped by kind; proposed entries are marked because conservative parsing ignores them.
 */
export function EntryList({ entries }: { entries: ConceptEntry[] }): ReactNode {
  if (entries.length === 0)
    return <p className="text-sm text-greyscale-600">No entries.</p>;
  const groups = new Map<string, ConceptEntry[]>();
  for (const entry of entries) {
    const kind = entry.kind ?? "OTHER";
    groups.set(kind, [...(groups.get(kind) ?? []), entry]);
  }
  const order = Object.keys(KIND_LABELS);
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {[...groups.entries()]
        .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
        .map(([kind, items]) => (
          <div key={kind} className="flex flex-col gap-1">
            <dt className="text-xs font-semibold uppercase text-greyscale-600">
              {KIND_LABELS[kind] ?? kind}
            </dt>
            <dd>
              <ul className="flex flex-wrap gap-1">
                {items.map((entry) => (
                  <li key={entry.id}>
                    <Badge
                      variant={
                        entry.status === "ACTIVE" ? "secondary" : "outline"
                      }
                    >
                      {entry.text}
                      {entry.status === "PROPOSED" ? (
                        <span className="font-normal"> (proposed)</span>
                      ) : null}
                    </Badge>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
    </dl>
  );
}

"use client";

import type { ReactNode } from "react";

import { Badge, cn } from "@peas/components";

import { AppLink, useAppNavigation } from "../app-navigation";
import { PageLinks, SearchForm } from "../shared";

export const LEXICON_ROLE_FILTERS = [
  { role: null, label: "All" },
  { role: "FOOD", label: "Foods" },
  { role: "ATTRIBUTE", label: "Attributes" },
  { role: "PREPARATION", label: "Preparations" },
  { role: "DEGREE", label: "Degrees" },
  { role: "MEASUREMENT_MODIFIER", label: "Measure words" },
  { role: "INSTRUCTION", label: "Instructions" },
] as const;

export type LexiconRoleFilter = Exclude<
  (typeof LEXICON_ROLE_FILTERS)[number]["role"],
  null
>;

export interface LexiconEntryRow {
  id: string;
  text: string;
  role: string;
  kind: string | null;
  status: string;
  targetLabel: string;
  conceptId: string | null;
}

export interface LexiconPageData {
  items: LexiconEntryRow[];
  total: number;
  page: number;
  pageSize: number;
}

function lexiconHref(
  query: string | undefined,
  role: LexiconRoleFilter | null,
  page: number
): string {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (role) params.set("role", role);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/lexicon?${search}` : "/lexicon";
}

const lower = (value: string) => value.replace(/_/g, " ").toLowerCase();

/**
 * Every name and modifier Peas knows, with what each one means: foods point at a concept, attributes at a value ("color: green"), preparations at an operation. Searchable and filterable by role.
 *
 * @example
 * <LexiconPageContent data={data.lexicon} query="chick" role="FOOD" />
 */
export function LexiconPageContent({
  data,
  query,
  role,
}: {
  data: LexiconPageData;
  query?: string;
  role: LexiconRoleFilter | null;
}): ReactNode {
  const { push } = useAppNavigation();
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">Lexicon</h1>
        <p className="text-sm text-greyscale-700">
          {data.total} {data.total === 1 ? "entry" : "entries"}
          {query ? ` matching “${query}”` : ""}
        </p>
      </header>
      <div className="flex flex-wrap items-end gap-4">
        <SearchForm
          id="lexicon-search"
          label="Search the lexicon"
          defaultValue={query}
          placeholder="chicken"
          onSearch={(value) => push(lexiconHref(value || undefined, role, 1))}
        />
        <nav aria-label="Lexicon role">
          <ul className="flex flex-wrap gap-3">
            {LEXICON_ROLE_FILTERS.map((filter) => (
              <li key={filter.label}>
                <AppLink
                  href={lexiconHref(query, filter.role, 1)}
                  aria-current={filter.role === role ? "page" : undefined}
                  className={cn(
                    "text-sm underline-offset-4",
                    filter.role === role
                      ? "font-medium text-primary underline decoration-2"
                      : "text-greyscale-600 hover:underline"
                  )}
                >
                  {filter.label}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {data.items.length === 0 ? (
        <p className="text-sm text-greyscale-700">No entries found.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Lexicon entries</caption>
          <thead className="border-b border-greyscale-200 text-xs text-greyscale-600">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Text
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Role
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Means
              </th>
              <th scope="col" className="py-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-greyscale-100">
            {data.items.map((entry) => (
              <tr key={entry.id}>
                <td className="py-2 pr-4 font-medium text-greyscale-900">
                  {entry.text}
                </td>
                <td className="py-2 pr-4 text-greyscale-700">
                  {lower(entry.role)}
                  {entry.kind ? (
                    <span className="text-greyscale-600">
                      {" "}
                      ({lower(entry.kind)})
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-4">
                  {entry.conceptId ? (
                    <AppLink
                      href={`/concepts/${entry.conceptId}`}
                      className="text-primary underline underline-offset-2"
                    >
                      {entry.targetLabel}
                    </AppLink>
                  ) : (
                    entry.targetLabel
                  )}
                </td>
                <td className="py-2">
                  {entry.status === "ACTIVE" ? (
                    <span className="text-greyscale-700">active</span>
                  ) : (
                    <Badge variant="outline">{lower(entry.status)}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <PageLinks
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        getHref={(page) => lexiconHref(query, role, page)}
        label="Lexicon pages"
      />
    </div>
  );
}

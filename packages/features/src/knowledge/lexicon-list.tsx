"use client";

import {
  ENTRY_ROLES,
  type EntryDraft,
  EntryEditor,
  type EntryRole,
  type LexiconEditing,
} from "./entry-editor";

import { type ReactNode, useState } from "react";

import { Badge, Button, cn } from "@peas/components";
import { Pencil, Plus } from "lucide-react";

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
  attributeValueId?: string | null;
  preparationId?: string | null;
  valueKey?: string | null;
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
  page: number,
  includeRetired = false,
  newestFirst = false
): string {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (role) params.set("role", role);
  if (page > 1) params.set("page", String(page));
  if (includeRetired) params.set("retired", "1");
  if (newestFirst) params.set("newest", "1");
  const search = params.toString();
  return search ? `/lexicon?${search}` : "/lexicon";
}

const lower = (value: string) => value.replace(/_/g, " ").toLowerCase();

function isEntryRole(role: string): role is EntryRole {
  return (ENTRY_ROLES as readonly string[]).includes(role);
}

/** A row as the editor starts from. */
function draftOf(entry: LexiconEntryRow): EntryDraft {
  const role = isEntryRole(entry.role) ? entry.role : "INSTRUCTION";
  const target =
    role === "FOOD"
      ? (entry.conceptId ?? "")
      : role === "ATTRIBUTE"
        ? (entry.attributeValueId ?? "")
        : role === "PREPARATION"
          ? (entry.preparationId ?? "")
          : (entry.valueKey ?? "");
  return {
    text: entry.text,
    role,
    target,
    targetLabel: role === "FOOD" ? entry.targetLabel : "",
    kind: (entry.kind as EntryDraft["kind"] | null) ?? "ALIAS",
    status: entry.status as EntryDraft["status"],
  };
}

function newDraft(role: LexiconRoleFilter | null): EntryDraft {
  return {
    text: "",
    role: role ?? "FOOD",
    target: "",
    targetLabel: "",
    kind: "ALIAS",
    status: "ACTIVE",
  };
}

/**
 * Every name and modifier Peas knows, with what each one means: foods point at a concept, attributes at a value ("color: green"), preparations at an operation. Searchable and filterable by role. With `editing`, each row has an edit button that turns it into an editable sentence, and new entries can be added; saving checks first whether stored mentions would read differently.
 *
 * @example
 * <LexiconPageContent data={data.lexicon} query="chick" role="FOOD" editing={{ vocabulary, onApplyDecision, onPreview, onSearchConcepts }} />
 */
export function LexiconPageContent({
  data,
  query,
  role,
  includeRetired = false,
  newestFirst = false,
  editing,
}: {
  data: LexiconPageData;
  query?: string;
  role: LexiconRoleFilter | null;
  /** Lists retired entries too, so they can be restored. */
  includeRetired?: boolean;
  /** Most recently added first, to see what Peas learned lately. */
  newestFirst?: boolean;
  editing?: LexiconEditing;
}): ReactNode {
  const { push } = useAppNavigation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const finish = (result: string | null) => {
    setEditingId(null);
    setIsAdding(false);
    if (result) setMessage(result);
  };
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
          onSearch={(value) =>
            push(
              lexiconHref(
                value || undefined,
                role,
                1,
                includeRetired,
                newestFirst
              )
            )
          }
        />
        <nav aria-label="Lexicon role">
          <ul className="flex flex-wrap gap-3">
            {LEXICON_ROLE_FILTERS.map((filter) => (
              <li key={filter.label}>
                <AppLink
                  href={lexiconHref(
                    query,
                    filter.role,
                    1,
                    includeRetired,
                    newestFirst
                  )}
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
        <AppLink
          href={lexiconHref(query, role, 1, !includeRetired, newestFirst)}
          className="text-sm text-greyscale-600 underline-offset-4 hover:underline"
        >
          {includeRetired ? "Hide retired" : "Show retired"}
        </AppLink>
        <AppLink
          href={lexiconHref(query, role, 1, includeRetired, !newestFirst)}
          className="text-sm text-greyscale-600 underline-offset-4 hover:underline"
        >
          {newestFirst ? "A to Z" : "Newest first"}
        </AppLink>
        <AppLink
          href="/lexicon/unknown"
          className="text-sm text-greyscale-600 underline-offset-4 hover:underline"
        >
          Unknown expressions
        </AppLink>
        {editing && !isAdding ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => {
              setEditingId(null);
              setMessage(null);
              setIsAdding(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add entry
          </Button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="text-sm text-success-900">
          {message}
        </p>
      ) : null}
      {editing && isAdding ? (
        <EntryEditor
          entryId={null}
          initial={newDraft(role)}
          editing={editing}
          onDone={finish}
        />
      ) : null}
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
              {editing ? (
                <th scope="col" className="py-2 font-medium">
                  <span className="sr-only">Edit</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-greyscale-100">
            {data.items.map((entry) =>
              editing && editingId === entry.id ? (
                <tr key={entry.id}>
                  <td colSpan={5} className="py-2">
                    <EntryEditor
                      entryId={entry.id}
                      initial={draftOf(entry)}
                      editing={editing}
                      onDone={finish}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={entry.id}>
                  <td className="py-2 pr-4 font-medium text-greyscale-900">
                    <AppLink
                      href={`/lexicon/${entry.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {entry.text}
                    </AppLink>
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
                      <Badge variant="outline">
                        {entry.status === "DEPRECATED"
                          ? "retired"
                          : lower(entry.status)}
                      </Badge>
                    )}
                  </td>
                  {editing ? (
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        aria-label={`Edit ${entry.text} (${lower(entry.role)})`}
                        onClick={() => {
                          setIsAdding(false);
                          setMessage(null);
                          setEditingId(entry.id);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
      <PageLinks
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        getHref={(page) =>
          lexiconHref(query, role, page, includeRetired, newestFirst)
        }
        label="Lexicon pages"
      />
    </div>
  );
}

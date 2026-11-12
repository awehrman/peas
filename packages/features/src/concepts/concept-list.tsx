"use client";

import type { ConceptsPageData } from "./types";

import type { ReactNode } from "react";

import { Badge } from "@peas/components";

import { AppLink, useAppNavigation } from "../app-navigation";
import { PageLinks, SearchForm } from "../shared";

function conceptsHref(query: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/concepts?${search}` : "/concepts";
}

/**
 * Every food concept, alphabetical, searchable by name or any of its entries.
 */
export function ConceptsPageContent({
  data,
  query,
}: {
  data: ConceptsPageData;
  query?: string;
}): ReactNode {
  const { push } = useAppNavigation();
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">Concepts</h1>
        <p className="text-sm text-greyscale-700">
          {data.total} {data.total === 1 ? "concept" : "concepts"}
          {query ? ` matching “${query}”` : ""}
        </p>
      </header>
      <SearchForm
        id="concept-search"
        label="Search concepts"
        defaultValue={query}
        placeholder="sugar"
        onSearch={(value) => push(conceptsHref(value || undefined, 1))}
      />
      {data.items.length === 0 ? (
        <p className="text-sm text-greyscale-700">No concepts found.</p>
      ) : (
        <ul
          aria-label="Concepts"
          className="flex flex-col divide-y divide-greyscale-200 rounded-lg border border-greyscale-200"
        >
          {data.items.map((concept) => (
            <li key={concept.id}>
              <AppLink
                href={`/concepts/${concept.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 hover:bg-greyscale-50"
              >
                <span className="font-medium text-greyscale-900">
                  {concept.canonicalName}
                </span>
                <span className="flex items-center gap-2 text-xs text-greyscale-700">
                  {concept.status === "PROPOSED" ? (
                    <Badge variant="outline">proposed</Badge>
                  ) : null}
                  {concept.entryCount}{" "}
                  {concept.entryCount === 1 ? "name" : "names"} ·{" "}
                  {concept.mentionCount}{" "}
                  {concept.mentionCount === 1 ? "mention" : "mentions"}
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      )}
      <PageLinks
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        getHref={(page) => conceptsHref(query, page)}
        label="Concept pages"
      />
    </div>
  );
}
